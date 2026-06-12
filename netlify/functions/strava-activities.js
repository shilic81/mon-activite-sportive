function parseJWT(token) {
  try {
    const [, body] = token.split('.')
    return JSON.parse(Buffer.from(body, 'base64').toString())
  } catch { return null }
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

export const handler = async (event) => {
  const cookieHeader = event.headers.cookie || ''
  const match = cookieHeader.match(/session=([^;]+)/)
  if (!match) return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié' }) }

  const payload = parseJWT(match[1])
  if (!payload?.strava_access_token) return { statusCode: 403, body: JSON.stringify({ error: 'Strava non connecté' }) }

  let accessToken = payload.strava_access_token
  let newCookie = null

  if (Date.now() / 1000 > payload.strava_expires_at - 300) {
    try {
      const r = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          refresh_token: payload.strava_refresh_token,
          grant_type: 'refresh_token'
        })
      })
      const refreshed = await r.json()
      accessToken = refreshed.access_token
      const newJwt = await createJWT({
        ...payload,
        strava_access_token: refreshed.access_token,
        strava_refresh_token: refreshed.refresh_token,
        strava_expires_at: refreshed.expires_at
      })
      newCookie = `session=${newJwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
    } catch (e) { console.error('Refresh failed', e) }
  }

  const params = event.queryStringParameters || {}
  const page = params.page || 1
  const perPage = params.per_page || 50
  let url = `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`
  if (params.before) url += `&before=${params.before}`
  if (params.after) url += `&after=${params.after}`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const activities = await res.json()

  const headers = { 'Content-Type': 'application/json' }
  if (newCookie) headers['Set-Cookie'] = newCookie

  return { statusCode: 200, headers, body: JSON.stringify(activities) }
}
