import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Activities from './pages/Activities'
import Stats from './pages/Stats'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)' }}>Chargement…</div>
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/activities" element={<PrivateRoute><Layout><Activities /></Layout></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><Layout><Stats /></Layout></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
