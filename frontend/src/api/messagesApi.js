import { api } from './client'

export function getMessages(friendId) {
  const qs = new URLSearchParams({ friendId })
  return api.get(`/messages?${qs}`)
}

export function sendMessage(toUserId, body) {
  return api.post('/messages', { toUserId, body })
}
