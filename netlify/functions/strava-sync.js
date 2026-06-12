import { jwtVerify, SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret')
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET

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

  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié' }) }

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

  // Rafraîchir si nécessaire
  if (Date.now() / 1000 > payload.strava_expires_at - 300) {
    try {
      const refreshed = await refreshStravaToken(payload.strava_refresh_token)
      accessToken = refreshed.access_token
    } catch (err) {
      console.error('Refresh failed:', err)
    }
  }

  // Récupérer tout l'historique page par page
  const allActivities = []
  let page = 1
  const perPage = 100

  // Timeout sécurité : max 8 secondes (limite Netlify = 10s)
  const startTime = Date.now()

  while (true) {
    if (Date.now() - startTime > 8000) break

    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const batch = await res.json()

    if (!Array.isArray(batch) || batch.length === 0) break

    allActivities.push(...batch)
    if (batch.length < perPage) break
    page++
  }

  // Calculer les stats globales
  const stats = computeStats(allActivities)

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total: allActivities.length,
      activities: allActivities,
      stats
    })
  }
}

function computeStats(activities) {
  const byType = {}
  let totalDistance = 0
  let totalTime = 0
  let totalElevation = 0

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
