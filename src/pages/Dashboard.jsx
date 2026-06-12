import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, parseISO, startOfWeek, addDays, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatDistance, formatDuration, getSportConfig } from '../utils/sports'

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const [activities, setActivities] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (searchParams.get('strava') === 'connected') setStravaConnected(true)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/me')
      const me = await res.json()
      setStravaConnected(me.stravaConnected)

      if (me.stravaConnected) {
        const actRes = await fetch('/.netlify/functions/strava-activities?per_page=30')
        const acts = await actRes.json()
        if (Array.isArray(acts)) setActivities(acts)
      }
    } catch (e) {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const syncAll = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/.netlify/functions/strava-sync')
      const data = await res.json()
      if (data.activities) {
        setActivities(data.activities.slice(0, 30))
        setStats(data.stats)
      }
    } catch (e) {
      setError('Erreur de synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  // Données pour le graphique hebdomadaire
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 7)
    const weekActs = activities.filter(a => {
      const d = parseISO(a.start_date)
      return d >= weekStart && d < weekEnd
    })
    return {
      week: format(weekStart, 'dd MMM', { locale: fr }),
      activités: weekActs.length,
      km: Math.round(weekActs.reduce((s, a) => s + (a.distance || 0), 0) / 1000)
    }
  })

  const recentActivities = activities.slice(0, 8)
  const totalDistance = activities.reduce((s, a) => s + (a.distance || 0), 0)
  const totalTime = activities.reduce((s, a) => s + (a.moving_time || 0), 0)
  const totalElevation = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)

  if (!stravaConnected) {
    return (
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Tableau de bord</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Bienvenue ! Connecte ton compte Strava pour commencer.</p>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚴</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Connecte Strava</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
            Autorise l'accès à tes activités pour les visualiser ici.
          </p>
          <a href="/.netlify/functions/auth-strava?action=connect" className="btn btn-primary">
            <span>🔗</span> Connecter Strava
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Tableau de bord</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {activities.length > 0 ? `${activities.length} activités chargées` : 'Synchronise pour voir tes données'}
          </p>
        </div>
        <button onClick={syncAll} disabled={syncing} className="btn btn-primary" style={{ opacity: syncing ? 0.7 : 1 }}>
          {syncing ? '⏳ Sync en cours…' : '↻ Tout synchroniser'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', textAlign: 'center', padding: 80 }}>Chargement…</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Activités', value: activities.length, icon: '⚡', color: 'var(--orange)' },
              { label: 'Distance', value: `${Math.round(totalDistance / 1000)} km`, icon: '📍', color: 'var(--blue)' },
              { label: 'Temps', value: `${Math.round(totalTime / 3600)}h`, icon: '⏱', color: 'var(--green)' },
              { label: 'Dénivelé', value: `${Math.round(totalElevation)} m`, icon: '⛰', color: '#f59e0b' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Space Grotesk', color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>Activités / semaine</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barSize={24}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text2)' }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Bar dataKey="activités" fill="var(--orange)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>Kilomètres / semaine</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text2)' }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Area type="monotone" dataKey="km" stroke="var(--blue)" fill="url(#kmGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent activities */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>Activités récentes</h3>
            {recentActivities.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Aucune activité — clique sur "Tout synchroniser" 👆
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivities.map(activity => {
                  const sport = getSportConfig(activity.sport_type || activity.type)
                  return (
                    <div key={activity.id} style={{
                      display: 'grid', gridTemplateColumns: '32px 1fr auto auto auto',
                      alignItems: 'center', gap: 16,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 20 }}>{sport.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{activity.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {format(parseISO(activity.start_date), 'dd MMM yyyy', { locale: fr })}
                          {' · '}{sport.label}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{formatDistance(activity.distance)}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{formatDuration(activity.moving_time)}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text3)' }}>
                        {activity.total_elevation_gain ? `↑ ${Math.round(activity.total_elevation_gain)}m` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
