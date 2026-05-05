const BASE_URL = import.meta.env.VITE_API_BASE_URL

async function request(path, options = {}) {
  const { body, token, ...rest } = options

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

  if (!res.ok) {
    const message = data?.detail || data?.message || `Request failed (${res.status})`
    throw new Error(message)
  }

  return data
}

async function rawRequest(path, options = {}) {
  const { token, ...rest } = options
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })
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
