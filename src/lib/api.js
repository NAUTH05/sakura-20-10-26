const BASE = '/api'

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(BASE + path, { credentials: 'include', ...options })
  } catch (err) {
    throw new Error('Không kết nối được máy chủ')
  }

  const type = res.headers.get('content-type') || ''
  const data = type.includes('application/json') ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const error = new Error(data?.error || `Yêu cầu thất bại (${res.status})`)
    error.status = res.status
    throw error
  }
  return data
}

const jsonBody = (body) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  content: () => request('/content'),

  login: (password) => request('/admin/login', jsonBody({ password })),
  logout: () => request('/admin/logout', { method: 'POST' }),
  session: () => request('/admin/session'),

  adminContent: () => request('/admin/content'),
  saveSettings: (patch) =>
    request('/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) }),

  createMemory: (data) => request('/admin/memories', jsonBody(data)),
  updateMemory: (id, data) =>
    request(`/admin/memories/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }),
  deleteMemory: (id) => request(`/admin/memories/${id}`, { method: 'DELETE' }),
  reorderMemories: (ids) =>
    request('/admin/memories/order', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) }),

  uploadImage: (memoryId, file, caption = '') => {
    const form = new FormData()
    form.append('file', file)
    form.append('caption', caption)
    return request(`/admin/memories/${memoryId}/images`, { method: 'POST', body: form })
  },
  deleteImage: (id) => request(`/admin/images/${id}`, { method: 'DELETE' }),

  uploadTrack: (file, title, scope = 'both') => {
    const form = new FormData()
    form.append('file', file)
    form.append('title', title)
    form.append('scope', scope)
    return request('/admin/tracks', { method: 'POST', body: form })
  },
  updateTrack: (id, data) =>
    request(`/admin/tracks/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }),
  deleteTrack: (id) => request(`/admin/tracks/${id}`, { method: 'DELETE' }),
}
