import { api } from './client'

// ── Моковые данные ───────────────────────────────────────────────────

const MOCK_USER = {
  id: 1,
  name: 'Анна Михайлова',
  initials: 'АМ',
  email: 'anna.m@email.com',
  timezone: 'UTC+3',
  language: 'ru',
  joinedAt: '2026-01-15',
  currentStreak: 23,
  bestStreak: 31,
  xpPoints: 1240,
  successRate: 82,
  notifications: {
    dailyReminder: true,
    friendActivity: true,
    streakAlert: false,
  },
}

// ── API-функции ──────────────────────────────────────────────────────

// GET /me  — профиль текущего пользователя
export function getMe() {
  return Promise.resolve(MOCK_USER)
  // return api.get('/me')
}

// PATCH /me  — обновить профиль
export function updateMe(data) {
  return Promise.resolve({ ...MOCK_USER, ...data })
  // return api.patch('/me', data)
}

// PATCH /me/notifications
export function updateNotifications(data) {
  return Promise.resolve({ ...MOCK_USER.notifications, ...data })
  // return api.patch('/me/notifications', data)
}
