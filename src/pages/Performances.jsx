import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSportConfig } from '../utils/sports'

const TARGET_LABELS = {
  400: '400 m', 800: '800 m', 1000: '1 km', 1609: '1 mile',
  3000: '3 km', 5000: '5 km', 10000: '10 km', 15000: '15 km',
  20000: '20 km', 21097: 'Semi', 30000: '30 km', 42195: 'Marathon',
  50000: '50 km', 100000: '100 km', 200000: '200 km',
  100: '100 m', 200: '200 m', 1500: '1500 m',
}

function formatTime(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`
  return `${m}'${String(s).padStart(2, '0')}"`
}

function formatPaceFromTime(seconds, distanceM) {
  if (!seconds || !distanceM) return ''
  const secPerKm = (seconds / distanceM) * 1000
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

export default function Performances() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('best_efforts')
  const [selectedType, setSelectedType] = useState('Run')
  const [medalYear, setMedalYear] = useState('all')

  useEffect(() => {
    fetch('/.netlify/functions/strava-performances?mode=best_efforts')
      .then(r => r.json())
      .then(d => { setData(d); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const sportTypes = data ? Object.keys(data.bestEffortsByType).sort() : []
  const currentBests = data?.bestEffortsByType?.[selectedType]?.bestEfforts || {}
  const medals = data?.medalCount || []

  const medalYears = ['all', ...new Set(medals.map(m => m.year))].sort((a, b) => {
    if (a === 'all') return -1
    if (b === 'all') return 1
    return b - a
  })

  const filteredMedals = medalYear === 'all'
    ? medals
    : medals.filter(m => m.year === parseInt(medalYear))

  const medalsByType = {}
  for (const m of filteredMedals) {
    if (!medalsByType[m.type]) medalsByType[m.type] = { type: m.type, kom: 0, gold: 0, silver: 0, bronze: 0, total: 0 }
    medalsByType[m.type].kom += m.kom || 0
    medalsByType[m.type].gold += m.gold || 0
    medalsByType[m.type].silver += m.silver || 0
    medalsByType[m.type].bronze += m.bronze || 0
    medalsByType[m.type].total += m.total || 0
  }
  const medalsBySport = Object.values(medalsByType).sort((a, b) => b.total - a.total)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Performances</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Tes meilleurs temps et médailles sur segments</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg2)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[
          { id: 'best_efforts', label: '🏆 Meilleurs temps' },
          { id: 'medals', label: '🎖 Médailles segments' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 20px', borderRadius: 7, fontSize: 14, fontWeight: 500,
            background: activeTab === tab.id ? 'var(--orange)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text2)',
            border: 'none', cursor: 'pointer', transition: 'all 0.15s'
          }}>{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>
          Analyse de toutes tes activités…
        </div>
      ) : (
        <>
          {activeTab === 'best_efforts' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {sportTypes.map(type => {
                  const s = getSportConfig(type)
                  const count = Object.keys(data.bestEffortsByType[type]?.bestEfforts || {}).length
                  if (count === 0) return null
                  return (
                    <button key={type} onClick={() => setSelectedType(type)} style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: selectedType === type ? s.color : 'var(--bg2)',
                      border: `1px solid ${selectedType === type ? s.color : 'var(--border)'}`,
                      color: selectedType === type ? 'white' : 'var(--text2)',
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}>{s.icon} {s.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span></button>
                  )
                })}
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '120px 1fr 140px 140px 160px',
                  padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)'
                }}>
                  <div>Distance</div><div>Activité</div>
                  <div style={{ textAlign: 'right' }}>Temps</div>
                  <div style={{ textAlign: 'right' }}>Allure</div>
                  <div style={{ textAlign: 'right' }}>Date</div>
                </div>

                {Object.entries(currentBests).length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
                    Aucun best effort trouvé pour cette discipline
                  </div>
                ) : (
                  Object.entries(currentBests)
                    .sort((a, b) => Number(a[0]) - Number(b[0]))
                    .map(([dist, effort], i, arr) => (
                      <div key={dist} style={{
                        display: 'grid', gridTemplateColumns: '120px 1fr 140px 140px 160px',
                        alignItems: 'center', padding: '14px 20px',
                        borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <span style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--orange-dim)', color: 'var(--orange)', fontSize: 13, fontWeight: 700 }}>
                            {TARGET_LABELS[dist] || `${(Number(dist) / 1000).toFixed(1)} km`}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', paddingRight: 16 }}>
                          {effort.activityName?.length > 35 ? effort.activityName.substring(0, 35) + '…' : effort.activityName}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--green)' }}>
                          {formatTime(effort.time)}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text3)' }}>
                          {selectedType === 'Run' ? formatPaceFromTime(effort.time, Number(dist)) : ''}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text3)' }}>
                          {format(parseISO(effort.date), 'dd MMM yyyy', { locale: fr })}
                          <span style={{ marginLeft: 6, fontSize: 11 }}>({effort.year})</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, fontStyle: 'italic' }}>
                * Temps calculés sur la base de ta vitesse moyenne lors des activités couvrant au moins 95% de la distance cible.
              </p>
            </div>
          )}

          {activeTab === 'medals' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
                {medalYears.map(y => (
                  <button key={y} onClick={() => setMedalYear(y)} style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: medalYear === y ? 'var(--orange)' : 'var(--bg2)',
                    border: `1px solid ${medalYear === y ? 'var(--orange)' : 'var(--border)'}`,
                    color: medalYear === y ? 'white' : 'var(--text2)', cursor: 'pointer'
                  }}>{y === 'all' ? 'Toutes années' : y}</button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { icon: '👑', label: 'KOM / QOM', value: filteredMedals.reduce((s, m) => s + (m.kom || 0), 0), color: '#a855f7' },
                  { icon: '🥇', label: 'Records perso', value: filteredMedals.reduce((s, m) => s + (m.gold || 0), 0), color: '#f59e0b' },
                  { icon: '🏅', label: 'Total achievements', value: filteredMedals.reduce((s, m) => s + (m.total || 0), 0), color: 'var(--green)' },
                  { icon: '📅', label: 'Années actives', value: new Set(medals.map(m => m.year)).size, color: 'var(--blue)' },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} className="card" style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Space Grotesk', color, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</div>
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: 'var(--text2)' }}>
                  Détail par discipline · {medalYear === 'all' ? 'toutes années' : medalYear}
                </h3>
                {medalsBySport.length === 0 ? (
                  <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '24px 0' }}>Aucune donnée</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr 1fr 80px', padding: '8px 0', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                      <div>Sport</div>
                      <div style={{ textAlign: 'center' }}>👑 KOM/QOM</div>
                      <div style={{ textAlign: 'center' }}>🥇 PR</div>
                      <div style={{ textAlign: 'center' }}>🥈 Top 10</div>
                      <div style={{ textAlign: 'center' }}>🥉 Top 10%</div>
                      <div style={{ textAlign: 'right' }}>Total</div>
                    </div>
                    {medalsBySport.map(m => {
                      const s = getSportConfig(m.type)
                      return (
                        <div key={m.type} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr 1fr 80px', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{s.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</span>
                          </div>
                          {[
                            { val: m.kom, color: '#a855f7' },
                            { val: m.gold, color: '#f59e0b' },
                            { val: m.silver, color: '#9ca3af' },
                            { val: m.bronze, color: '#cd7c2f' },
                          ].map(({ val, color }, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                              {val > 0
                                ? <span style={{ padding: '3px 10px', borderRadius: 20, background: `${color}22`, color, fontSize: 14, fontWeight: 700 }}>{val}</span>
                                : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>
                              }
                            </div>
                          ))}
                          <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700 }}>{m.total}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 12, fontStyle: 'italic' }}>
                * Les PR sont comptés depuis les données résumées Strava. Les KOM/QOM nécessitent des appels détaillés par activité.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
