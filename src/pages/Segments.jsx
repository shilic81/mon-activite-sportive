import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getSportConfig } from '../utils/sports'

const MEDAL_CONFIG = {
  kom:    { icon: '👑', label: 'KOM / QOM', color: '#a855f7', bg: '#a855f722' },
  gold:   { icon: '🥇', label: 'Record perso', color: '#f59e0b', bg: '#f59e0b22' },
  silver: { icon: '🥈', label: 'Top 10', color: '#9ca3af', bg: '#9ca3af22' },
  bronze: { icon: '🥉', label: 'Top 10%', color: '#cd7c2f', bg: '#cd7c2f22' },
}

function formatTime(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`
  return `${m}'${String(s).padStart(2,'0')}"`
}

export default function Segments() {
  const [medals, setMedals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const [hasMore, setHasMore] = useState(false)
  const [nextBatch, setNextBatch] = useState(null)
  const [done, setDone] = useState(false)
  const [medalFilter, setMedalFilter] = useState('all')
  const [sportFilter, setSportFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchBatch = useCallback(async (batch = 0, append = false) => {
    if (batch === 0) setLoading(true)
    else setLoadingMore(true)
    try {
      const res = await fetch(`/.netlify/functions/strava-segments?batch=${batch}`)
      const data = await res.json()
      if (data.medals) {
        setMedals(prev => append ? [...prev, ...data.medals] : data.medals)
        setProgress({ processed: data.processed, total: data.totalActivities })
        setHasMore(data.hasMore)
        setNextBatch(data.nextBatch)
        if (!data.hasMore) setDone(true)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [])

  useEffect(() => { fetchBatch(0) }, [fetchBatch])

  const years = ['all', ...new Set(medals.map(m => m.year))].sort((a, b) => {
    if (a === 'all') return -1
    if (b === 'all') return 1
    return b - a
  })
  const sports = ['all', ...new Set(medals.map(m => m.activityType))]

  const filtered = medals.filter(m => {
    if (medalFilter !== 'all' && m.medal !== medalFilter) return false
    if (sportFilter !== 'all' && m.activityType !== sportFilter) return false
    if (yearFilter !== 'all' && m.year !== parseInt(yearFilter)) return false
    if (search && !m.segmentName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = medals.reduce((acc, m) => {
    acc[m.medal] = (acc[m.medal] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Segments médaillés</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {done
              ? `${medals.length} médailles sur ${progress.total} activités analysées`
              : `Analyse en cours… ${progress.processed} / ${progress.total} activités`}
          </p>
        </div>
        {hasMore && (
          <button onClick={() => fetchBatch(nextBatch, true)} disabled={loadingMore} className="btn btn-primary" style={{ opacity: loadingMore ? 0.7 : 1 }}>
            {loadingMore ? '⏳ Chargement…' : `↻ Charger la suite (${progress.total - progress.processed} restantes)`}
          </button>
        )}
      </div>

      {!done && progress.total > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: 'var(--orange)', width: `${(progress.processed / progress.total) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            {Math.round((progress.processed / progress.total) * 100)}% analysé
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {Object.entries(MEDAL_CONFIG).map(([key, cfg]) => (
          <div key={key} className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer', border: `1px solid ${medalFilter === key ? cfg.color : 'var(--border)'}`, transition: 'all 0.15s' }}
            onClick={() => setMedalFilter(medalFilter === key ? 'all' : key)}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{cfg.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Space Grotesk', color: cfg.color, marginBottom: 4 }}>{counts[key] || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{cfg.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher un segment…"
          style={{ flex: 1, minWidth: 200, padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none' }} />
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          style={{ padding: '10px 14px', background: 'var(--bg2)', border: `1px solid ${yearFilter !== 'all' ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 8, color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          <option value="all">📅 Toutes années</option>
          {years.filter(y => y !== 'all').map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
          style={{ padding: '10px 14px', background: 'var(--bg2)', border: `1px solid ${sportFilter !== 'all' ? 'var(--orange)' : 'var(--border)'}`, borderRadius: 8, color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>
          <option value="all">🏅 Tous les sports</option>
          {sports.filter(s => s !== 'all').map(s => {
            const cfg = getSportConfig(s)
            return <option key={s} value={s}>{cfg.icon} {cfg.label}</option>
          })}
        </select>
        {(medalFilter !== 'all' || sportFilter !== 'all' || yearFilter !== 'all' || search) && (
          <button onClick={() => { setMedalFilter('all'); setSportFilter('all'); setYearFilter('all'); setSearch('') }}
            style={{ padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Récupération de tes segments médaillés…<br />
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Cela peut prendre quelques secondes</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>Aucun segment trouvé</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 100px 100px 110px', padding: '12px 20px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
              <div>Médaille</div>
              <div>Segment · Activité</div>
              <div>Sport</div>
              <div style={{ textAlign: 'right' }}>Temps</div>
              <div style={{ textAlign: 'right' }}>Distance</div>
              <div style={{ textAlign: 'right' }}>Date</div>
            </div>
            {filtered.map((m, i) => {
              const medal = MEDAL_CONFIG[m.medal]
              const sport = getSportConfig(m.activityType)
              return (
                <div key={`${m.segmentId}-${m.date}-${i}`}
                  style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 100px 100px 110px', alignItems: 'center', padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <span style={{ padding: '3px 8px', borderRadius: 6, background: medal.bg, color: medal.color, fontSize: 12, fontWeight: 700 }}>
                      {medal.icon} {m.label}
                    </span>
                  </div>
                  <div style={{ paddingRight: 16 }}>
                    <a href={m.stravaUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}
                      onMouseEnter={e => e.target.style.color = 'var(--orange)'}
                      onMouseLeave={e => e.target.style.color = 'var(--text)'}>
                      {m.segmentName}
                    </a>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {m.activityName?.length > 40 ? m.activityName.substring(0, 40) + '…' : m.activityName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{sport.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{sport.label}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                    {formatTime(m.effortTime)}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text2)' }}>
                    {m.distance ? `${(m.distance / 1000).toFixed(2)} km` : '—'}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text3)' }}>
                    {format(parseISO(m.date), 'dd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {hasMore && !loading && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => fetchBatch(nextBatch, true)} disabled={loadingMore} className="btn btn-ghost">
            {loadingMore ? '⏳ Chargement…' : `↻ Charger ${progress.total - progress.processed} activités de plus`}
          </button>
        </div>
      )}
    </div>
  )
}
