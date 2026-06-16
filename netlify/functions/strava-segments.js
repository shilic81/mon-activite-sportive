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

  const params = event.queryStringParameters || {}
  const batchPage = parseInt(params.batch || '0')
  const BATCH_SIZE = 20

  try {
    // Étape 1 : toutes les activités avec achievements
    const allActs = []
    let page = 1
    const startTime = Date.now()

    while (true) {
      if (Date.now() - startTime > 5000) break
      const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=100`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      const batch = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) break
      allActs.push(...batch.filter(a => a.achievement_count > 0))
      if (batch.length < 100) break
      page++
    }

    allActs.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

    const totalActivities = allActs.length
    const startIdx = batchPage * BATCH_SIZE
    const batchActs = allActs.slice(startIdx, startIdx + BATCH_SIZE)
    const hasMore = startIdx + BATCH_SIZE < totalActivities

    // Étape 2 : détails de chaque activité du batch
    const medals = []

    for (const act of batchActs) {
      try {
        const detailRes = await fetch(`https://www.strava.com/api/v3/activities/${act.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        const detail = await detailRes.json()
        if (!detail.segment_efforts) continue

        for (const effort of detail.segment_efforts) {
          // Utiliser pr_rank pour les médailles personnelles
          const prRank = effort.pr_rank
          const isKom = effort.achievements?.some(a => a.type_id === 5)

          if (!prRank && !isKom) continue

          let medalType = 'bronze'
          let label = '3ème perso 🥉'

          if (isKom) { medalType = 'kom'; label = 'KOM / QOM' }
          else if (prRank === 1) { medalType = 'gold'; label = 'PR 🥇' }
          else if (prRank === 2) { medalType = 'silver'; label = '2ème perso 🥈' }
          else if (prRank === 3) { medalType = 'bronze'; label = '3ème perso 🥉' }
          else continue

          medals.push({
            segmentId: effort.segment?.id,
            segmentName: effort.segment?.name || 'Segment inconnu',
            activityId: act.id,
            activityName: act.name,
            activityType: act.sport_type || act.type || 'Other',
            date: effort.start_date || act.start_date,
            year: new Date(act.start_date).getFullYear(),
            medal: medalType,
            label,
            rank: prRank || null,
            effortTime: effort.elapsed_time,
            distance: effort.distance,
            stravaUrl: `https://www.strava.com/activities/${act.id}`
          })
        }
      } catch (e) {
        console.error(`Error fetching activity ${act.id}:`, e)
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medals,
        totalActivities,
        batchPage,
        hasMore,
        nextBatch: hasMore ? batchPage + 1 : null,
        processed: startIdx + batchActs.length
      })
    }

  } catch (err) {
    console.error('Segments error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) }
  }
}
