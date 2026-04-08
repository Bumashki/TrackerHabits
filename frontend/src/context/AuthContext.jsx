import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMe, loginRequest, registerRequest, updateMe, updateNotifications } from '../api/authApi'
import { clearAuth, loadAuth, saveAuth } from '../authStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  const bootstrap = useCallback(async () => {
    const a = loadAuth()
    if (!a?.token) {
      setUser(null)
      setReady(true)
      return
    }
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      clearAuth()
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const login = useCallback(
    async (email, password) => {
      const t = await loginRequest(email, password)
      saveAuth({
        token: t.access_token,
        userId: t.user_id,
        email: t.email,
        name: t.name,
        initials: t.initials,
        nickname: t.nickname,
      })
      const me = await getMe()
      setUser(me)
      navigate('/today', { replace: true })
    },
    [navigate]
  )

  const register = useCallback(
    async (email, password, name, nickname) => {
      const t = await registerRequest(email, password, name, nickname)
      saveAuth({
        token: t.access_token,
        userId: t.user_id,
        email: t.email,
        name: t.name,
        initials: t.initials,
        nickname: t.nickname,
      })
      const me = await getMe()
      setUser(me)
      navigate('/today', { replace: true })
    },
    [navigate]
  )

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    navigate('/login', { replace: true })
  }, [navigate])

  const saveProfile = useCallback(async data => {
    const updated = await updateMe(data)
    setUser(updated)
  }, [])

  const saveNotifications = useCallback(async data => {
    const n = await updateNotifications(data)
    setUser(prev => (prev ? { ...prev, notifications: n } : null))
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      saveProfile,
      saveNotifications,
    }),
    [user, ready, login, register, logout, saveProfile, saveNotifications]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вне AuthProvider')
  return ctx
}
