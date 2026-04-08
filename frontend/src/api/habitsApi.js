import { api } from './client'

// GET /habits
export function getHabits() {
  return api.get('/habits')
}

// POST /habits
export function createHabit(data) {
  return api.post('/habits', data)
}

// PATCH /habits/:id
export function updateHabit(id, data) {
  return api.patch(`/habits/${id}`, data)
}

// DELETE /habits/:id
export function deleteHabit(id) {
  return api.delete(`/habits/${id}`)
}

// POST /habits/:id/complete  — отметить выполнение за дату
export function completeHabit(id, date) {
  return api.post(`/habits/${id}/complete`, date ? { date } : {})
}

// DELETE /habits/:id/complete — снять отметку за дату
export function uncompleteHabit(id, date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return api.delete(`/habits/${id}/complete${q}`)
}
