function parseJWT(token) {
  try {
    const [, body] = token.split('.')
    return JSON.parse(Buffer.from(body, 'base64').toString())
  } catch { return null }
}

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET

async function refreshToken(refreshTok) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, refresh_token: refreshTok, grant_type: 'refresh_token' })
  })
  return r.json()
}

export const handler = async (event) => {
  const cookieHeader = event.headers.cookie || ''
  const match = cookieHeader.match(/session=([^;]+)/)
  if (!match) return { statusCode: 401, body: JSON.stringify({ error: 'Non authentifié' }) }

  const payload = parseJWT(match[1])
  if (!payload?.strava_access_token) return { statusCode: 403, body: JSON.stringify({ error: 'Strava non connecté' }) }

  let accessToken = payload.strava_access_token
  if (Date.now() / 1000 > payload.strava_expires_at - 300) {
    try { const r = await refreshToken(payload.strava_refresh_token); accessToken = r.access_token } catch (e) { console.error(e) }
  }

  const TARGET_DISTANCES = {
    Run: [400, 800, 1000, 1609, 3000, 5000, 10000, 15000, 20000, 21097, 30000, 42195],
    Ride: [10000, 20000, 30000, 40000, 50000, 100000, 200000],
    Swim: [100, 200, 400, 800, 1000, 1500, 3000],
  }

  try {
    const allActs = []
    let page = 1
    const startTime = Date.now()

    while (true) {
      if (Date.now() - startTime > 7000) break
      const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=100`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const batch = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) break
      allActs.push(...batch)
      if (batch.length < 100) break
      page++
    }

    const bestByType = {}

    for (const act of allActs) {
      const type = act.sport_type || act.type || 'Other'
      if (!bestByType[type]) bestByType[type] = { activities: [], bestEfforts: {} }
      bestByType[type].activities.push(act)

      const targets = TARGET_DISTANCES[type] || []
      const dist = act.distance || 0
      const speed = act.average_speed || 0

      if (dist > 0 && speed > 0) {
        for (const target of targets) {
          if (dist >= target * 0.95) {
            const estimatedTime = Math.round(target / speed)
            const existing = bestByType[type].bestEfforts[target]
            if (!existing || estimatedTime < existing.time) {
              bestByType[type].bestEfforts[target] = {
                time: estimatedTime,
                date: act.start_date,
                activityName: act.name,
                activityId: act.id,
                year: new Date(act.start_date).getFullYear()
              }
            }
          }
        }
      }
    }

    // Médailles par sport et par année
    const medalCount = {}
    for (const act of allActs) {
      const type = act.sport_type || act.type || 'Other'
      const year = new Date(act.start_date).getFullYear()
      const key = `${type}_${year}`
      if (!medalCount[key]) medalCount[key] = { type, year, kom: 0, gold: 0, silver: 0, bronze: 0, total: 0 }
      if (act.achievement_count > 0) medalCount[key].total += act.achievement_count
      if (act.pr_count > 0) medalCount[key].gold += act.pr_count
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bestEffortsByType: bestByType,
        medalCount: Object.values(medalCount).sort((a, b) => b.year - a.year || a.type.localeCompare(b.type))
      })
    }

  } catch (err) {
    console.error('Performances error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) }
  }
}
