import { api } from './client'
import { localDateISO } from '../utils/dateLocal'

function todayQuery() {
  return `?today=${encodeURIComponent(localDateISO())}`
}

// GET /habits — «сегодня» в часовом поясе клиента (streak, completedToday)
export function getHabits() {
  return api.get(`/habits${todayQuery()}`)
}

// POST /habits
export function createHabit(data) {
  return api.post(`/habits${todayQuery()}`, data)
}

// PATCH /habits/:id
export function updateHabit(id, data) {
  return api.patch(`/habits/${id}${todayQuery()}`, data)
}

// DELETE /habits/:id
export function deleteHabit(id) {
  return api.delete(`/habits/${id}`)
}

// POST /habits/:id/complete  — отметить выполнение за дату (локальный день)
export function completeHabit(id, date) {
  const d = date || localDateISO()
  return api.post(`/habits/${id}/complete`, { date: d })
}

// DELETE /habits/:id/complete — снять отметку за дату
export function uncompleteHabit(id, date) {
  const d = date || localDateISO()
  return api.delete(`/habits/${id}/complete?date=${encodeURIComponent(d)}`)
}
