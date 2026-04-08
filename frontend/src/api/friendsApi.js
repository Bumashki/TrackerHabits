import { api } from './client'

// GET /friends
export function getFriends() {
  return api.get('/friends')
}

// GET /friends/feed
export function getFriendsFeed() {
  return api.get('/friends/feed')
}

// POST /friends/:id/cheer  — отправить похвалу
export function cheerFriend(id) {
  return api.post(`/friends/${id}/cheer`, {})
}

// POST /friends/invite  — пригласить по email
export function inviteFriend(email) {
  return api.post('/friends/invite', { email })
}
