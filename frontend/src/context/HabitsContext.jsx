import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabit,
  uncompleteHabit,
} from '../api/habitsApi'
import { localDateISO } from '../utils/dateLocal'

const HabitsContext = createContext(null)

// Провайдер оборачивает всё приложение в App.jsx
// Все страницы получают данные через useHabits() без повторных запросов
export function HabitsProvider({ children }) {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const data = await getHabits()
      setHabits(data)
    } catch (e) {
      setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function create(data) {
    const newHabit = await createHabit(data)
    setHabits(prev => [...prev, newHabit])
    return newHabit
  }

  async function update(id, data) {
    const updated = await updateHabit(id, data)
    setHabits(prev => prev.map(h => h.id === id ? updated : h))
  }

  async function remove(id) {
    await deleteHabit(id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  async function complete(id) {
    await completeHabit(id, localDateISO())
    await load({ silent: true })
  }

  async function uncomplete(id) {
    await uncompleteHabit(id, localDateISO())
    await load({ silent: true })
  }

  return (
    <HabitsContext.Provider value={{ habits, loading, error, create, update, remove, complete, uncomplete, reload: load }}>
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabits() {
  const ctx = useContext(HabitsContext)
  if (!ctx) throw new Error('useHabits должен быть внутри HabitsProvider')
  return ctx
}
