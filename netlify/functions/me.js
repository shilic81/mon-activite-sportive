import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')

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

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authenticated: true,
        user: {
          name: payload.name,
          email: payload.email,
          picture: payload.picture
        },
        stravaConnected: !!payload.strava_access_token,
        stravaAthleteName: payload.strava_athlete_name,
        stravaAthletePhoto: payload.strava_athlete_photo
      })
    }
  } catch (_) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authenticated: false })
    }
  }
}
