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
        {Object.entries(MEDAL_CONFIG).map(([key, { icon, label, color, bg }]) => (
          <div key={key} className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer', border: `1px solid ${medalFilter === key ? color : 'var(--border)'}`, transition: 'all 0.15s' }}
            onClick={() => setMedalFilter(medalFilter === key ? 'all' : key)}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div
