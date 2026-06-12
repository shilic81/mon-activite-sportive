import { jwtVerify, SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const SITE_URL = process.env.SITE_URL || 'http://localhost:8888'

const refreshStravaToken = async (refreshToken) => {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })
  return res.json()
}

export const handler = async (event) => {
  const cookieHeader = event.headers.cookie || ''
  const match = cookieHeader.match(/session=([^;]+)/)
  const token = match ? match[1] : null

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié' }) }
  }

  let payload
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    payload = verified.payload
  } catch (_) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Session invalide' }) }
  }

  if (!payload.strava_access_token) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Strava non connecté' }) }
  }

  let accessToken = payload.strava_access_token
  let newCookie = null

  // Rafraîchir le token si expiré
  if (Date.now() / 1000 > payload.strava_expires_at - 300) {
    try {
      const refreshed = await refreshStravaToken(payload.strava_refresh_token)
      accessToken = refreshed.access_token

      const newJwt = await new SignJWT({
        ...payload,
        strava_access_token: refreshed.access_token,
        strava_refresh_token: refreshed.refresh_token,
        strava_expires_at: refreshed.expires_at
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(JWT_SECRET)

      newCookie = `session=${newJwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
    } catch (err) {
      console.error('Token refresh failed:', err)
    }
  }

  // Paramètres de la requête
  const params = event.queryStringParameters || {}
  const page = params.page || 1
  const perPage = params.per_page || 50
  const before = params.before || ''
  const after = params.after || ''

  let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`
  if (before) url += `&before=${before}`
  if (after) url += `&after=${after}`

  try {
    const activitiesRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
    const activities = await activitiesRes.json()

    const headers = { 'Content-Type': 'application/json' }
    if (newCookie) headers['Set-Cookie'] = newCookie

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(activities)
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur Strava API' }) }
  }
}
