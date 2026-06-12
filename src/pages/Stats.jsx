import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, parseISO, getYear, getMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSportConfig, formatDistance, formatDuration } from '../utils/sports'

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function Stats() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetch('/.netlify/functions/strava-sync')
      .then(r => r.json())
      .then(data => { if (data.activities) setActivities(data.activities) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const years = [...new Set(activities.map(a => getYear(parseISO(a.start_date))))].sort((a, b) => b - a)
  const yearActs = activities.filter(a => getYear(parseISO(a.start_date)) === year)

  // Par mois
  const byMonth = MONTHS.map((m, i) => {
    const acts = yearActs.filter(a => getMonth(parseISO(a.start_date)) === i)
    return {
      month: m,
      activités: acts.length,
      km: Math.round(acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000),
      h: Math.round(acts.reduce((s, a) => s + (a.moving_time || 0), 0) / 3600 * 10) / 10
    }
  })

  // Par sport
  const bySport = {}
  for (const a of yearActs) {
    const type = a.sport_type || a.type || 'Other'
    if (!bySport[type]) bySport[type] = { count: 0, distance: 0, time: 0, elevation: 0 }
    bySport[type].count++
    bySport[type].distance += a.distance || 0
    bySport[type].time += a.moving_time || 0
    bySport[type].elevation += a.total_elevation_gain || 0
  }
  const sportData = Object.entries(bySport)
    .map(([type, data]) => ({ type, ...data, config: getSportConfig(type) }))
    .sort((a, b) => b.count - a.count)

  const pieData = sportData.slice(0, 6).map(s => ({
    name: s.config.label,
    value: s.count,
    color: s.config.color
  }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Statistiques</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>{yearActs.length} activités en {year}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 500,
              background: y === year ? 'var(--orange)' : 'var(--bg2)',
              border: `1px solid ${y === year ? 'var(--orange)' : 'var(--border)'}`,
              color: y === year ? 'white' : 'var(--text2)',
              cursor: 'pointer'
            }}>{y}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>
          Chargement de tout l'historique…
        </div>
      ) : (
        <>
          {/* KPIs annuels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Activités', value: yearActs.length, icon: '⚡' },
              { label: 'Km parcourus', value: `${Math.round(yearActs.reduce((s, a) => s + (a.distance || 0), 0) / 1000)} km`, icon: '📍' },
              { label: 'Heures', value: `${Math.round(yearActs.reduce((s, a) => s + (a.moving_time || 0), 0) / 3600)}h`, icon: '⏱' },
              { label: 'Dénivelé', value: `${Math.round(yearActs.reduce((s, a) => s + (a.total_elevation_gain || 0), 0))} m`, icon: '⛰' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="card" style={{ padding: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Space Grotesk' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>Activités par mois</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth} barSize={20}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: 'var(--text)' }} labelStyle={{ color: 'var(--text2)' }} />
                  <Bar dataKey="activités" fill="var(--orange)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="km" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>Répartition sports</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} itemStyle={{ color: 'var(--text)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Par sport */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>Détail par sport</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {sportData.map(({ type, count, distance, time, elevation, config }) => (
                <div key={type} style={{
                  padding: '16px',
                  background: 'var(--bg3)',
                  borderRadius: 10,
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 22 }}>{config.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{config.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{count} activité{count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Distance', value: formatDistance(distance) },
                      { label: 'Durée', value: formatDuration(time) },
                      { label: 'Dénivelé', value: elevation > 0 ? `${Math.round(elevation)} m` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
