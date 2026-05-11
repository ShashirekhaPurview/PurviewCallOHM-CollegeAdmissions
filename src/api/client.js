const BASE_URL = import.meta.env.VITE_API_BASE_URL
const STORAGE_KEY = 'callohm_auth'

// Deduplicate concurrent refresh attempts
let _refreshPromise = null

function _getStoredSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null } catch { return null }
}

function _saveStoredSession(data, role) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role,
  }))
}

function _clearAndRedirect() {
  localStorage.removeItem(STORAGE_KEY)
  window.location.href = '/login'
}

async function _attemptRefresh() {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const session = _getStoredSession()
    if (!session?.refreshToken) { _clearAndRedirect(); throw new Error('Session expired') }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) { _clearAndRedirect(); throw new Error('Session expired') }
    _saveStoredSession(data, session.role)
    return data
  })().finally(() => { _refreshPromise = null })

  return _refreshPromise
}

async function request(path, options = {}) {
  const { body, token, _isRetry, ...rest } = options

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json().catch(() => null)

  if (res.status === 401 && !_isRetry) {
    try {
      await _attemptRefresh()
      const newSession = _getStoredSession()
      return request(path, { body, ...rest, token: newSession?.accessToken, _isRetry: true })
    } catch {
      _clearAndRedirect()
      const err = new Error('Session expired')
      err.status = 401
      throw err
    }
  }

  if (!res.ok) {
    const message = data?.detail || data?.message || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    throw err
  }

  return data
}

async function rawRequest(path, options = {}) {
  const { token, _isRetry, ...rest } = options
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })

  if (res.status === 401 && !_isRetry) {
    try {
      await _attemptRefresh()
      const newSession = _getStoredSession()
      return rawRequest(path, { ...rest, token: newSession?.accessToken, _isRetry: true })
    } catch {
      _clearAndRedirect()
      throw new Error('Session expired')
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      message = data?.detail || data?.message || message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res
}

export const api = {
  get: (path, options) => request(path, { method: 'GET', ...options }),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  patch: (path, body, options) => request(path, { method: 'PATCH', body, ...options }),
  del: (path, options) => request(path, { method: 'DELETE', ...options }),
  postForm: (path, formData, options = {}) => {
    const { token, ...rest } = options
    return rawRequest(path, {
      method: 'POST',
      body: formData,
      token,
      ...rest,
    }).then(r => r.json())
  },
  getBlob: (path, options) =>
    rawRequest(path, { method: 'GET', ...options }).then(r => r.blob()),
}
