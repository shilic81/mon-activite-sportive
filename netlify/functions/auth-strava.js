import { jwtVerify, SignJWT } from 'jose'

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')
const SITE_URL = process.env.SITE_URL || 'http://localhost:8888'
const REDIRECT_URI = `${SITE_URL}/.netlify/functions/auth-strava`

// Helper : lire le cookie session
const getSessionFromCookie = (cookieHeader) => {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/session=([^;]+)/)
  return match ? match[1] : null
}

export const handler = async (event) => {
  const { code, error, action } = event.queryStringParameters || {}
  const cookieHeader = event.headers.cookie || ''

  // Action : initier la connexion Strava
  if (action === 'connect') {
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read_all,profile:read_all'
    })
    return {
      statusCode: 302,
      headers: { Location: `https://www.strava.com/oauth/authorize?${params}` }
    }
  }

  if (error) {
    return { statusCode: 302, headers: { Location: `${SITE_URL}/dashboard?error=strava_denied` } }
  }

  if (!code) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing code' }) }
  }

  try {
    // Échanger le code contre les tokens Strava
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    })
    const stravaData = await tokenRes.json()
    if (!stravaData.access_token) throw new Error('No Strava access token')

    // Récupérer la session Google existante si présente
    const sessionToken = getSessionFromCookie(cookieHeader)
    let sessionPayload = {}
    if (sessionToken) {
      try {
        const { payload } = await jwtVerify(sessionToken, JWT_SECRET)
        sessionPayload = payload
      } catch (_) {}
    }

    // Créer un nouveau JWT enrichi avec les tokens Strava
    const jwt = await new SignJWT({
      ...sessionPayload,
      strava_access_token: stravaData.access_token,
      strava_refresh_token: stravaData.refresh_token,
      strava_expires_at: stravaData.expires_at,
      strava_athlete_id: stravaData.athlete?.id,
      strava_athlete_name: `${stravaData.athlete?.firstname} ${stravaData.athlete?.lastname}`,
      strava_athlete_photo: stravaData.athlete?.profile
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(JWT_SECRET)

    return {
      statusCode: 302,
      headers: {
        Location: `${SITE_URL}/dashboard?strava=connected`,
        'Set-Cookie': `session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      }
    }
  } catch (err) {
    console.error('Strava auth error:', err)
    return { statusCode: 302, headers: { Location: `${SITE_URL}/dashboard?error=strava_failed` } }
  }
}
