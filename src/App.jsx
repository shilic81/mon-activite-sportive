import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Activities from './pages/Activities'
import Stats from './pages/Stats'
import Performances from './pages/Performances'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const [auth, setAuth] = useState(null)

  useEffect(() => {
    fetch('/.netlify/functions/me')
      .then(r => r.json())
      .then(d => setAuth(d.authenticated))
      .catch(() => setAuth(false))
  }, [])

  if (auth === null) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8b92a8', background: '#0f1117' }}>
      Chargement…
    </div>
  )
  return auth ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/activities" element={<PrivateRoute><Layout><Activities /></Layout></PrivateRoute>} />
        <Route path="/stats" element={<PrivateRoute><Layout><Stats /></Layout></PrivateRoute>} />
        <Route path="/performances" element={<PrivateRoute><Layout><Performances /></Layout></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
