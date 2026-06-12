function parseJWT(token) {
  try {
    const [, body] = token.split('.')
    return JSON.parse(Buffer.from(body, 'base64').toString())
  } catch { return null }
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
    } catch (e) { console.error('Refresh failed', e) }
  }

  const allActivities = []
  let page = 1
  const startTime = Date.now()

  while (true) {
    if (Date.now() - startTime > 8000) break
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    allActivities.push(...batch)
    if (batch.length < 100) break
    page++
  }

  const stats = computeStats(allActivities)
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ total: allActivities.length, activities: allActivities, stats })
  }
}

function computeStats(activities) {
  const byType = {}
  let totalDistance = 0, totalTime = 0, totalElevation = 0
  for (const a of activities) {
    const type = a.sport_type || a.type || 'Other'
    if (!byType[type]) byType[type] = { count: 0, distance: 0, time: 0, elevation: 0 }
    byType[type].count++
    byType[type].distance += a.distance || 0
    byType[type].time += a.moving_time || 0
    byType[type].elevation += a.total_elevation_gain || 0
    totalDistance += a.distance || 0
    totalTime += a.moving_time || 0
    totalElevation += a.total_elevation_gain || 0
  }
  return {
    totalActivities: activities.length,
    totalDistanceKm: Math.round(totalDistance / 1000),
    totalTimeHours: Math.round(totalTime / 3600),
    totalElevationM: Math.round(totalElevation),
    byType
  }
}
