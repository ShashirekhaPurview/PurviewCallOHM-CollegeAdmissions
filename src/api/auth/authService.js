import { api } from '../client'

const STORAGE_KEY = 'callohm_auth'

export function saveSession(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.role,
  }))
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Decode the JWT payload (no signature check - for client-side info only). */
export function getCurrentUser() {
  const session = getSession()
  if (!session?.accessToken) return null
  try {
    const payload = session.accessToken.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      user_id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      org_id: decoded.org_id ?? null,
    }
  } catch {
    return null
  }
}

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password })
  saveSession(data)
  return data
}

export async function refreshSession() {
  const session = getSession()
  if (!session?.refreshToken) throw new Error('No refresh token available')

  const data = await api.post('/auth/refresh', { refresh_token: session.refreshToken })
  // Server rotates the refresh token - save both new tokens, keep existing role
  saveSession({ ...data, role: session.role })
  return data
}

export async function logout() {
  const session = getSession()
  if (!session) return

  try {
    await api.post(
      '/auth/logout',
      { refresh_token: session.refreshToken },
      { token: session.accessToken }
    )
  } finally {
    clearSession()
  }
}
