import { api } from './client'

// ── Моковые данные ───────────────────────────────────────────────────

const MOCK_FRIENDS = [
  {
    id: 1,
    name: 'Катя С.',
    initials: 'КС',
    color: '#2d6a4f',
    isOnline: true,
    lastSeen: null,
    streak: 18,
    completedToday: 5,
    totalToday: 6,
    xpThisWeek: 35,
  },
  {
    id: 2,
    name: 'Миша В.',
    initials: 'МВ',
    color: '#1d6fa3',
    isOnline: true,
    lastSeen: null,
    streak: 31,
    completedToday: 6,
    totalToday: 6,
    xpThisWeek: 42,
  },
  {
    id: 3,
    name: 'Оля А.',
    initials: 'ОА',
    color: '#b45309',
    isOnline: false,
    lastSeen: '2 ч назад',
    streak: 9,
    completedToday: 3,
    totalToday: 4,
    xpThisWeek: 22,
  },
]

const MOCK_FEED = [
  { id: 1, userId: 2, initials: 'МВ', color: '#1d6fa3', text: 'Миша В. выполнил все 6 привычек', time: '5 мин назад', streak: 31 },
  { id: 2, userId: 1, initials: 'КС', color: '#2d6a4f', text: 'Катя С. установила рекорд серии — 18 дней',  time: '1 час назад', streak: null },
  { id: 3, userId: 3, initials: 'ОА', color: '#b45309', text: 'Оля А. добавила привычку «Йога»', time: '2 часа назад', streak: null },
  { id: 4, userId: 0, initials: 'АМ', color: null,      text: 'Вы выполнили 4 привычки', time: 'Сегодня', streak: 23 },
]

// ── API-функции ──────────────────────────────────────────────────────

// GET /friends
export function getFriends() {
  return Promise.resolve(MOCK_FRIENDS)
  // return api.get('/friends')
}

// GET /friends/feed
export function getFriendsFeed() {
  return Promise.resolve(MOCK_FEED)
  // return api.get('/friends/feed')
}

// POST /friends/:id/cheer  — отправить похвалу
export function cheerFriend(id) {
  return Promise.resolve()
  // return api.post(`/friends/${id}/cheer`)
}

// POST /friends/invite  — пригласить по email
export function inviteFriend(email) {
  return Promise.resolve()
  // return api.post('/friends/invite', { email })
}
