import { useState, useEffect, createContext, useContext } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [stravaConnected, setStravaConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/me')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user)
          setStravaConnected(data.stravaConnected)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, stravaConnected, loading, setStravaConnected }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
