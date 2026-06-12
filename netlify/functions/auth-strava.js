function parseJWT(token) {
  try {
    const [, body] = token.split('.')
    return JSON.parse(Buffer.from(body, 'base64').toString())
  } catch { return {} }
}

async function createJWT(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  const base64url = (str) => Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }))
  const crypto = await import('crypto')
  const sig = crypto.default.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${header}.${body}.${sig}`
}

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET
const SITE_URL = process.env.SITE_URL || 'http://localhost:8888'
const REDIRECT_URI = `${SITE_URL}/.netlify/functions/auth-strava`

export const handler = async (event) => {
  const { code, error, action } = event.queryStringParameters || {}
  const cookieHeader = event.headers.cookie || ''

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

  if (error) return { statusCode: 302, headers: { Location: `${SITE_URL}/dashboard?error=strava_denied` } }
  if (!code) return { statusCode: 400, body: JSON.stringify({ error: 'Missing code' }) }

  try {
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

    const match = cookieHeader.match(/session=([^;]+)/)
    const existingPayload = match ? parseJWT(match[1]) : {}

    const jwt = await createJWT({
      ...existingPayload,
      strava_access_token: stravaData.access_token,
      strava_refresh_token: stravaData.refresh_token,
      strava_expires_at: stravaData.expires_at,
      strava_athlete_id: stravaData.athlete?.id,
      strava_athlete_name: `${stravaData.athlete?.firstname} ${stravaData.athlete?.lastname}`,
      strava_athlete_photo: stravaData.athlete?.profile
    })

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
