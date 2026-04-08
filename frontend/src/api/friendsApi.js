import { api } from './client'

export function getFriends() {
  return api.get('/friends')
}

/** Один запрос: друзья + лента + входящие/исходящие (быстрее, чем 4 отдельных). */
export function getFriendsOverview() {
  return api.get('/friends/overview')
}

export function getFriendsIncoming() {
  return api.get('/friends/incoming')
}

export function getFriendsOutgoing() {
  return api.get('/friends/outgoing')
}

export function getFriendsFeed() {
  return api.get('/friends/feed')
}

export function cheerFriend(id) {
  return api.post(`/friends/${id}/cheer`, {})
}

export function inviteFriend(email) {
  return api.post('/friends/invite', { email })
}

export function searchFriendsByNickname(q) {
  const qs = new URLSearchParams({ q })
  return api.get(`/friends/search?${qs}`)
}

export function addFriendRequest(friendId) {
  return api.post(`/friends/${friendId}/request`, {})
}

export function acceptFriendRequest(requesterId) {
  return api.post(`/friends/${requesterId}/accept`, {})
}

export function declineFriendRequest(requesterId) {
  return api.post(`/friends/${requesterId}/decline`, {})
}

export function cancelOutgoingFriendRequest(friendId) {
  return api.delete(`/friends/${friendId}/request`)
}

/** Удалить из друзей (обе стороны связи) */
export function removeFriend(friendId) {
  return api.delete(`/friends/${friendId}`)
}
