import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, parseISO, startOfWeek, addDays, subWeeks, getYear } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatDistance, formatDuration, getSportConfig } from '../utils/sports'

export default function Dashboard() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [sportFilter, setSportFilter] = useState('all')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/me')
      const me = await res.json()
      setStravaConnected(me.stravaConnected)
      if (me.stravaConnected) {
        const actRes = await fetch('/.netlify/functions/strava-activities?per_page=100')
        const acts = await actRes.json()
        if (Array.isArray(acts)) setActivities(acts)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const syncAll = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/.netlify/functions/strava-sync')
      const data = await res.json()
      if (data.activities) setActivities(data.activities)
    } catch (e) { console.error(e) }
    finally { setSyncing(false) }
  }

  // Filtrer sur 2026
  const acts2026 = activities.filter(a => getYear(parseISO(a.start_date)) === 2026)
  const sportTypes = [...new Set(acts2026.map(a => a.sport_type || a.type).filter(Boolean))].sort()
  const filteredActs = sportFilter === 'all' ? acts2026 : acts2026.filter(a => (a.sport_type || a.type) === sportFilter)

  // Données graphique semaines 2026
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(new Date(), 7 - i), { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 7)
    const weekActs = filteredActs.filter(a => {
      const d = parseISO(a.start_date)
      return d >= weekStart && d < weekEnd
    })
    return {
      week: format(weekStart, 'dd MMM', { locale: fr }),
      activités: weekActs.length,
      km: Math.round(weekActs.reduce((s, a) => s + (a.distance || 0), 0) / 1000)
    }
  })

  const recentActivities = filteredActs.slice(0, 8)
  const totalDistance = filteredActs.reduce((s, a) => s + (a.distance || 0), 0)
  const totalTime = filteredActs.reduce((s, a) => s + (a.moving_time || 0), 0)
  const totalElevation = filteredActs.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)

  if (!stravaConnected) {
    return (
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Tableau de bord</h1>
        <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Bienvenue ! Connecte ton compte Strava pour commencer.</p>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚴</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Connecte Strava</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>Autorise l'accès à tes activités pour les visualiser ici.</p>
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Tableau de bord 2026</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {filteredActs.length} activité{filteredActs.length !== 1 ? 's' : ''}
            {sportFilter !== 'all' ? ` · ${getSportConfig(sportFilter).label}` : ' · toutes disciplines'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Filtre sport */}
          <select
            value={sportFilter}
            onChange={e => setSportFilter(e.target.value)}
            style={{
              padding: '10px 14px', background: 'var(--bg2)',
              border: '1px solid var(--border2)', borderRadius: 8,
              color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="all">🏅 Tous les sports</option>
            {sportTypes.map(t => {
              const s = getSportConfig(t)
              return <option key={t} value={t}>{s.icon} {s.label}</option>
            })}
          </select>
          <button onClick={syncAll} disabled={syncing} className="btn btn-primary" style={{ opacity: syncing ? 0.7 : 1 }}>
            {syncing ? '⏳ Sync…' : '↻ Synchroniser'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', textAlign: 'center', padding: 80 }}>Chargement…</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Activités', value: filteredActs.length, icon: '⚡', color: 'var(--orange)' },
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

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>
                Activités / semaine {sportFilter !== 'all' ? `· ${getSportConfig(sportFilter).icon}` : ''}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barSize={24}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text2)' }} itemStyle={{ color: 'var(--text)' }} />
                  <Bar dataKey="activités" fill={sportFilter !== 'all' ? getSportConfig(sportFilter).color : 'var(--orange)'} radius={[4, 4, 0, 0]} />
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
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text2)' }} itemStyle={{ color: 'var(--text)' }} />
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
                Aucune activité — clique sur "Synchroniser" 👆
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
