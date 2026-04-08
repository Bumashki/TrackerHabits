import { api } from './client'

// GET /me  — профиль текущего пользователя
export function getMe() {
  return api.get('/me')
}

// PATCH /me  — обновить профиль
export function updateMe(data) {
  return api.patch('/me', data)
}

// PATCH /me/notifications
export function updateNotifications(data) {
  return api.patch('/me/notifications', data)
}
