import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

function useAuth() {
  const [user, setUser] = useState(null)
  const [stravaConnected, setStravaConnected] = useState(false)
  useEffect(() => {
    fetch('/.netlify/functions/me')
      .then(r => r.json())
      .then(data => { if (data.authenticated) { setUser(data.user); setStravaConnected(data.stravaConnected) } })
      .catch(() => {})
  }, [])
  return { user, stravaConnected }
}

export default function Layout({ children }) {
  const { user, stravaConnected } = useAuth()
  const location = useLocation()

  const nav = [
    { path: '/dashboard', icon: '◈', label: 'Tableau de bord' },
    { path: '/activities', icon: '◉', label: 'Activités' },
    { path: '/performances', icon: '🏆', label: 'Performances' },
    { path: '/segments', icon: '🎖', label: 'Segments' },
    { path: '/stats', icon: '◎', label: 'Statistiques' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10 }}>
        <div style={{ padding: '0 20px 28px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--orange)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Mon activité</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>sportive</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {nav.map(({ path, icon, label }) => (
            <Link key={path} to={path} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 2, fontSize: 14, fontWeight: 500, background: location.pathname === path ? 'var(--orange-dim)' : 'transparent', color: location.pathname === path ? 'var(--orange2)' : 'var(--text2)', transition: 'all 0.15s', textDecoration: 'none' }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{label}
            </Link>
          ))}
        </nav>
        {user && (
          <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {user.picture && <img src={user.picture} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name?.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{user.email}</div>
              </div>
            </div>
            {!stravaConnected && (
              <a href="/.netlify/functions/auth-strava?action=connect" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 13, color: 'white', background: 'var(--orange)', border: 'none', cursor: 'pointer', textDecoration: 'none', marginBottom: 8 }}>🔗 Connecter Strava</a>
            )}
            <a href="/.netlify/functions/logout" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, fontSize: 13, color: 'var(--text3)', background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', textDecoration: 'none' }}>↩ Déconnexion</a>
          </div>
        )}
      </aside>
      <main style={{ flex: 1, marginLeft: 220, padding: '32px', minHeight: '100vh' }}>{children}</main>
    </div>
  )
}
