import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { formatDistance, formatDuration, formatPace, getSportConfig } from '../utils/sports'

export default function Activities() {
  const [activities, setActivities] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  useEffect(() => {
    fetch('/.netlify/functions/strava-activities?per_page=100')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data)
          setFiltered(data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = activities
    if (search) result = result.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()))
    if (sportFilter !== 'all') result = result.filter(a => (a.sport_type || a.type) === sportFilter)
    setFiltered(result)
    setPage(1)
  }, [search, sportFilter, activities])

  const sportTypes = [...new Set(activities.map(a => a.sport_type || a.type).filter(Boolean))]
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Activités</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>{filtered.length} activité{filtered.length !== 1 ? 's' : ''}</p>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Rechercher..."
          style={{
            flex: 1, minWidth: 200, padding: '10px 16px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 14,
            outline: 'none'
          }}
        />
        <select
          value={sportFilter}
          onChange={e => setSportFilter(e.target.value)}
          style={{
            padding: '10px 16px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text)', fontSize: 14, cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="all">Tous les sports</option>
          {sportTypes.map(t => {
            const s = getSportConfig(t)
            return <option key={t} value={t}>{s.icon} {s.label}</option>
          })}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text2)' }}>Chargement…</div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>Aucune activité trouvée</div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 100px 100px 100px 120px',
              padding: '12px 20px',
              fontSize: 11, fontWeight: 600, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              borderBottom: '1px solid var(--border)'
            }}>
              <div></div>
              <div>Activité</div>
              <div style={{ textAlign: 'right' }}>Distance</div>
              <div style={{ textAlign: 'right' }}>Durée</div>
              <div style={{ textAlign: 'right' }}>Allure</div>
              <div style={{ textAlign: 'right' }}>Dénivelé</div>
            </div>
            {paginated.map((activity, i) => {
              const sport = getSportConfig(activity.sport_type || activity.type)
              return (
                <div key={activity.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 100px 100px 100px 120px',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: i < paginated.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                  cursor: 'default'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 20 }}>{sport.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{activity.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {format(parseISO(activity.start_date), 'EEE dd MMM yyyy', { locale: fr })}
                      <span style={{
                        marginLeft: 8, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--bg3)', fontSize: 11, color: sport.color
                      }}>{sport.label}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 500 }}>{formatDistance(activity.distance)}</div>
                  <div style={{ textAlign: 'right', fontSize: 14, color: 'var(--text2)' }}>{formatDuration(activity.moving_time)}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text3)' }}>{formatPace(activity.average_speed, activity.sport_type)}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text3)' }}>
                    {activity.total_elevation_gain ? `↑ ${Math.round(activity.total_elevation_gain)} m` : '—'}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              width: 36, height: 36, borderRadius: 8,
              background: p === page ? 'var(--orange)' : 'var(--bg2)',
              border: `1px solid ${p === page ? 'var(--orange)' : 'var(--border)'}`,
              color: p === page ? 'white' : 'var(--text2)',
              cursor: 'pointer', fontSize: 14, fontWeight: 500
            }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
