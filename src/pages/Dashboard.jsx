import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { format, parseISO, getYear, getMonth, startOfMonth, endOfMonth, eachWeekOfInterval, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatDistance, formatDuration, getSportConfig } from '../utils/sports'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function Dashboard() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [sportFilter, setSportFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/me')
      const me = await res.json()
      setStravaConnected(me.stravaConnected)
      if (me.stravaConnected) {
        const actRes = await fetch('/.netlify/functions/strava-sync')
        const data = await actRes.json()
        if (data.activities) setActivities(data.activities)
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

  const acts2026 = activities.filter(a => getYear(parseISO(a.start_date)) === 2026)
  const sportTypes = [...new Set(acts2026.map(a => a.sport_type || a.type).filter(Boolean))].sort()
  const monthsAvailable = [...new Set(acts2026.map(a => getMonth(parseISO(a.start_date))))].sort((a, b) => a - b)

  const filteredActs = acts2026.filter(a => {
    const matchSport = sportFilter === 'all' || (a.sport_type || a.type) === sportFilter
    const matchMonth = monthFilter === 'all' || getMonth(parseISO(a.start_date)) === parseInt(monthFilter)
    return matchSport && matchMonth
  })

  const weeklyData = (() => {
    if (monthFilter !== 'all') {
      const monthIdx = parseInt(monthFilter)
      const start = startOfMonth(new Date(2026, monthIdx, 1))
      const end = endOfMonth(new Date(2026, monthIdx, 1))
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
      return weeks.map(weekStart => {
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
    } else {
      return MONTHS.map((m, i) => {
        const monthActs = filteredActs.filter(a => getMonth(parseISO(a.start_date)) === i)
        return {
          week: m.substring(0, 3),
          activités: monthActs.length,
          km: Math.round(monthActs.reduce((s, a) => s + (a.distance || 0), 0) / 1000)
        }
      })
    }
  })()

  const recentActivities = filteredActs.slice(0, 10)
  const totalDistance = filteredActs.reduce((s, a) => s + (a.distance || 0), 0)
  const totalTime = filteredActs.reduce((s, a) => s + (a.moving_time || 0), 0)
  const totalElevation = filteredActs.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
  const periodLabel = monthFilter !== 'all' ? `${MONTHS[parseInt(monthFilter)]} 2026` : 'Année 2026 complète'

  if (!stravaConnected) {
    return (
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Tableau de bord</h1>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚴</div>
          <a href="/.netlify/functions/auth-strava?action=connect" className="btn btn-primary">
            <span>🔗</span> Connecter Strava
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Tableau de bord</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {filteredActs.length} activité{filteredActs.length !== 1 ? 's' : ''} · {periodLabel}
            {sportFilter !== 'all' ? ` · ${getSportConfig(sportFilter).label}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ padding: '10px 14px', background: 'var(--bg2)', border: `1px solid ${monthFilter !== 'all' ? 'var(--blue)' : 'var(--border2)'}`, borderRadius: 8, color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
            <option value="all">📅 Toute l'année</option>
            {monthsAvailable.map(m => <option key={m} value={m}>📅 {MONTHS[m]}</option>)}
          </select>
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)} style={{ padding: '10px 14px', background: 'var(--bg2)', border: `1px solid ${sportFilter !== 'all' ? 'var(--orange)' : 'var(--border2)'}`, borderRadius: 8, color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
            <option value="all">🏅 Tous les sports</option>
            {sportTypes.map(t => { const s = getSportConfig(t); return <option key={t} value={t}>{s.icon} {s.label}</option> })}
          </select>
          <button onClick={syncAll} disabled={syncing} className="btn btn-primary" style={{ opacity: syncing ? 0.7 : 1 }}>
            {syncing ? '⏳ Sync…' : '↻ Synchroniser'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text2)', textAlign: 'center', padding: 80 }}>Chargement de toutes tes activités…</div>
      ) : (
        <>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>
                Activités {monthFilter !== 'all' ? '/ semaine' : '/ mois'}{sportFilter !== 'all' ? ` · ${getSportConfig(sportFilter).icon}` : ''}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barSize={22}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--text2)' }} itemStyle={{ color: 'var(--text)' }} />
                  <Bar dataKey="activités" fill={sportFilter !== 'all' ? getSportConfig(sportFilter).color : 'var(--orange)'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>
                Kilomètres {monthFilter !== 'all' ? '/ semaine' : '/ mois'}
              </h3>
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

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>
              Activités récentes
              {filteredActs.length > 10 && <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>10 sur {filteredActs.length}</span>}
            </h3>
            {recentActivities.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Aucune activité pour cette période</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentActivities.map((activity, i) => {
                  const sport = getSportConfig(activity.sport_type || activity.type)
                  return (
                    <div key={activity.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto auto auto', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < recentActivities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: 20 }}>{sport.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{activity.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {format(parseISO(activity.start_date), 'EEEE dd MMM', { locale: fr })}
                          <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'var(--bg3)', fontSize: 11, color: sport.color }}>{sport.label}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{formatDistance(activity.distance)}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>{formatDuration(activity.moving_time)}</div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text3)' }}>{activity.total_elevation_gain ? `↑ ${Math.round(activity.total_elevation_gain)}m` : ''}</div>
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
