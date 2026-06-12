function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function createJWT(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }))
  const crypto = await import('crypto')
  const sig = crypto.default.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${header}.${body}.${sig}`
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const SITE_URL = process.env.SITE_URL || 'http://localhost:8888'
const REDIRECT_URI = `${SITE_URL}/.netlify/functions/auth-google`

export const handler = async (event) => {
  const { code, error } = event.queryStringParameters || {}

  if (!code && !error) {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account'
    })
    return {
      statusCode: 302,
      headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }
    }
  }

  if (error) {
    return { statusCode: 302, headers: { Location: `${SITE_URL}/?error=google_denied` } }
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('No access token')

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const profile = await profileRes.json()

    const jwt = await createJWT({
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture
    })

    return {
      statusCode: 302,
      headers: {
        Location: `${SITE_URL}/dashboard`,
        'Set-Cookie': `session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      }
    }
  } catch (err) {
    console.error('Google auth error:', err)
    return { statusCode: 302, headers: { Location: `${SITE_URL}/?error=auth_failed` } }
  }
}
