import { getAuthHeaders } from '../authStorage'

// В dev Vite проксирует /api → бэкенд; в production Nginx отдаёт тот же префикс на FastAPI.
const BASE_URL = '/api'

async function request(method, path, body) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(BASE_URL + path, options)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }

  if (res.status === 204) return null

  return res.json()
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
}
