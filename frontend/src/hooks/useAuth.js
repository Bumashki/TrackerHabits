import { useState, useEffect } from 'react'
import { getMe, updateMe, updateNotifications } from '../api/authApi'

export function useAuth() {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getMe()
        setUser(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function saveProfile(data) {
    const updated = await updateMe(data)
    setUser(updated)
  }

  async function saveNotifications(data) {
    const updated = await updateNotifications(data)
    setUser(prev => ({ ...prev, notifications: updated }))
  }

  return { user, loading, error, saveProfile, saveNotifications }
}
