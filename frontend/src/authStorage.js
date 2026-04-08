const KEY = 'habit_tracker_auth_v1'

/** @returns {{ token: string, userId: string, email?: string, name?: string, initials?: string, nickname?: string } | null} */
export function loadAuth() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveAuth(payload) {
  localStorage.setItem(KEY, JSON.stringify(payload))
}

export function clearAuth() {
  localStorage.removeItem(KEY)
}

export function getAuthHeaders() {
  const a = loadAuth()
  if (!a?.token) return {}
  return { Authorization: `Bearer ${a.token}` }
}
