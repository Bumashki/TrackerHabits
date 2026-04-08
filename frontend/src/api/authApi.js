import { api } from './client'

export function loginRequest(email, password) {
  return api.post('/auth/login', { email, password })
}

export function registerRequest(email, password, name, nickname) {
  return api.post('/auth/register', { email, password, name, nickname })
}

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
