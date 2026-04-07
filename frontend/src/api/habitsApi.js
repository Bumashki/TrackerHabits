import { api } from './client'

// ── Моковые данные ───────────────────────────────────────────────────
// Удали этот блок и раскомментируй вызовы api.* когда бэкенд готов.

const MOCK_HABITS = [
  {
    id: 1,
    name: 'Утренняя медитация',
    icon: 'fa-spa',
    color: '#2d6a4f',
    category: 'Здоровье',
    schedule: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    reminderTime: '06:00',
    goal: '10 мин',
    streak: 23,
    completedToday: true,
    completionRate: 96,
    isActive: true,
    isScheduledToday: true,
  },
  {
    id: 2,
    name: 'Пробежка',
    icon: 'fa-person-running',
    color: '#1d6fa3',
    category: 'Спорт',
    schedule: ['mon', 'wed', 'fri', 'sat'],
    reminderTime: '07:30',
    goal: '30 мин',
    streak: 11,
    completedToday: true,
    completionRate: 78,
    isActive: true,
    isScheduledToday: true,
  },
  {
    id: 3,
    name: 'Чтение книги',
    icon: 'fa-book-open',
    color: '#7a3ea0',
    category: 'Саморазвитие',
    schedule: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    reminderTime: '21:00',
    goal: '20 стр',
    streak: 7,
    completedToday: true,
    completionRate: 65,
    isActive: true,
    isScheduledToday: true,
  },
  {
    id: 4,
    name: 'Выпить 2 л воды',
    icon: 'fa-droplet',
    color: '#b45309',
    category: 'Здоровье',
    schedule: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    reminderTime: '',
    goal: '2000 мл',
    streak: 5,
    completedToday: true,
    completionRate: 55,
    isActive: true,
    isScheduledToday: true,
  },
  {
    id: 5,
    name: 'Игра на гитаре',
    icon: 'fa-guitar',
    color: '#c0392b',
    category: 'Творчество',
    schedule: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    reminderTime: '19:00',
    goal: '15 мин',
    streak: 0,
    completedToday: false,
    completionRate: 18,
    isActive: true,
    isScheduledToday: true,
  },
  {
    id: 6,
    name: 'Дневник',
    icon: 'fa-note-sticky',
    color: '#6b6b66',
    category: 'Саморазвитие',
    schedule: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    reminderTime: '22:00',
    goal: '5 мин',
    streak: 0,
    completedToday: false,
    completionRate: 40,
    isActive: false,
    isScheduledToday: true,
  },
]

// ── API-функции ──────────────────────────────────────────────────────
// Каждая функция — один эндпоинт. Замена мока на реальный вызов — одна строка.

// GET /habits
export function getHabits() {
  return Promise.resolve(MOCK_HABITS)
  // return api.get('/habits')
}

// POST /habits
export function createHabit(data) {
  const newHabit = {
    ...data,
    id: Date.now(),
    streak: 0,
    completedToday: false,
    completionRate: 0,
    isActive: true,
    isScheduledToday: true,
  }
  return Promise.resolve(newHabit)
  // return api.post('/habits', data)
}

// PATCH /habits/:id
export function updateHabit(id, data) {
  const habit = MOCK_HABITS.find(h => h.id === id) ?? {}
  return Promise.resolve({ ...habit, ...data })
  // return api.patch(`/habits/${id}`, data)
}

// DELETE /habits/:id
export function deleteHabit(id) {
  return Promise.resolve()
  // return api.delete(`/habits/${id}`)
}

// POST /habits/:id/complete  — отметить выполнение за дату
export function completeHabit(id, date) {
  return Promise.resolve()
  // return api.post(`/habits/${id}/complete`, { date })
}

// DELETE /habits/:id/complete — снять отметку за дату
export function uncompleteHabit(id, date) {
  return Promise.resolve()
  // return api.delete(`/habits/${id}/complete?date=${date}`)
}
