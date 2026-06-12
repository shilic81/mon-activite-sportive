function parseJWT(token) {
  try {
    const [, body] = token.split('.')
    const payload = JSON.parse(Buffer.from(body, 'base64').toString())
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

export const handler = async (event) => {
  const cookieHeader = event.headers.cookie || ''
  const match = cookieHeader.match(/session=([^;]+)/)
  const token = match ? match[1] : null

  if (!token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authenticated: false })
    }
  }

  const payload = parseJWT(token)
  if (!payload) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authenticated: false })
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authenticated: true,
      user: { name: payload.name, email: payload.email, picture: payload.picture },
      stravaConnected: !!payload.strava_access_token,
      stravaAthleteName: payload.strava_athlete_name,
      stravaAthletePhoto: payload.strava_athlete_photo
    })
  }
}
