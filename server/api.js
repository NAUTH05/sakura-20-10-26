import {
  json,
  fail,
  uid,
  parseCookies,
  createSession,
  readSession,
  sessionCookie,
  clearCookie,
  SESSION_COOKIE,
  timingSafeEqual,
  sha256Hex,
  clientIp,
} from './util.js'

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}
const AUDIO_TYPES = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
}
const MAX_IMAGE = 10 * 1024 * 1024
const MAX_AUDIO = 20 * 1024 * 1024

const SETTINGS_SCHEMA = {
  siteTitle: 'string',
  welcomeKicker: 'string',
  welcomeTitle: 'string',
  welcomeSubtitle: 'string',
  welcomeButton: 'string',
  introLine: 'string',
  letter: 'string',
  dreamHint: 'string',
  wakeLabel: 'string',
  specialDate: 'string',
  defaultCamera: ['overview', 'road', 'cinematic'],
  musicDefaultId: 'stringOrNull',
  musicVolume: 'number',
  petalIntensity: 'number',
  lightIntensity: 'number',
  rain: 'boolean',
  fog: 'boolean',
  bloom: 'boolean',
  npcEnabled: 'boolean',
  npcCouples: 'number',
  npcSpeed: 'number',
  npcBehavior: ['wander', 'stroll', 'lingering'],
}

function sanitizeSettings(input) {
  const out = {}
  if (!input || typeof input !== 'object') return out
  for (const [key, rule] of Object.entries(SETTINGS_SCHEMA)) {
    if (!(key in input)) continue
    const v = input[key]
    if (Array.isArray(rule)) {
      if (typeof v === 'string' && rule.includes(v)) out[key] = v
    } else if (rule === 'string') {
      if (typeof v === 'string') out[key] = v.slice(0, 4000)
    } else if (rule === 'stringOrNull') {
      out[key] = typeof v === 'string' && v ? v.slice(0, 200) : null
    } else if (rule === 'number') {
      const n = Number(v)
      if (Number.isFinite(n)) out[key] = n
    } else if (rule === 'boolean') {
      out[key] = !!v
    }
  }
  return out
}

// best-effort login throttling (per isolate / dev process)
const attempts = new Map()
function tooManyAttempts(ip) {
  const rec = attempts.get(ip)
  if (!rec) return false
  if (Date.now() - rec.first > 10 * 60 * 1000) {
    attempts.delete(ip)
    return false
  }
  return rec.count >= 8
}
function noteAttempt(ip, ok) {
  if (ok) {
    attempts.delete(ip)
    return
  }
  const rec = attempts.get(ip) || { count: 0, first: Date.now() }
  rec.count += 1
  attempts.set(ip, rec)
}

async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function mediaKeyFromPath(path) {
  const raw = decodeURIComponent(path.replace('/media/', ''))
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9]{2,5}$/.test(raw)) return null
  return raw
}

async function parseForm(request) {
  try {
    return await request.formData()
  } catch {
    return null
  }
}

async function saveUpload(form, storage, kind) {
  if (!form) return { error: fail('Expected multipart form data', 400) }
  const file = form.get('file')
  if (!file || typeof file === 'string') return { error: fail('No file uploaded', 400) }

  const table = kind === 'image' ? IMAGE_TYPES : AUDIO_TYPES
  const limit = kind === 'image' ? MAX_IMAGE : MAX_AUDIO
  const type = (file.type || '').toLowerCase()
  const ext = table[type]

  if (!ext) return { error: fail(`Unsupported ${kind} format: ${type || 'unknown'}`, 415) }
  if (file.size > limit) {
    return { error: fail(`File is larger than ${Math.round(limit / 1024 / 1024)}MB`, 413) }
  }
  if (file.size === 0) return { error: fail('Empty file', 400) }

  const key = `${kind}-${uid()}.${ext}`
  const buffer = await file.arrayBuffer()
  await storage.put(key, buffer, type)
  return { key, size: file.size, type, caption: String(form.get('caption') || '') }
}

export async function handleApi(request, ctx) {
  const { repo, storage, env = {} } = ctx
  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/api/, '') || '/'
  const method = request.method.toUpperCase()
  const secret = env.SESSION_SECRET || 'dev-only-insecure-secret'
  const secureCookie = url.protocol === 'https:'

  // ---------------------------------------------------------------- public
  if (path === '/health') {
    return json({ ok: true, storage: repo.kind, dev: !!env.DEV })
  }

  if (path === '/content' && method === 'GET') {
    const content = await repo.getContent(false)
    return json(content)
  }

  if (path.startsWith('/media/') && method === 'GET') {
    const key = mediaKeyFromPath(path)
    if (!key) return fail('Bad media key', 400)
    const file = await storage.get(key)
    if (!file) return fail('Not found', 404)
    return new Response(file.body, {
      headers: {
        'content-type': file.type,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    })
  }

  // ------------------------------------------------------------------ auth
  if (path === '/admin/login' && method === 'POST') {
    const ip = clientIp(request)
    if (tooManyAttempts(ip)) return fail('Too many attempts. Try again later.', 429)

    const body = await readJson(request)
    const password = typeof body?.password === 'string' ? body.password : ''
    const expected = env.ADMIN_PASSWORD || 'sakura'

    const [a, b] = await Promise.all([sha256Hex(password), sha256Hex(expected)])
    if (!password || !timingSafeEqual(a, b)) {
      noteAttempt(ip, false)
      await new Promise((r) => setTimeout(r, 250))
      return fail('Incorrect password', 401)
    }

    noteAttempt(ip, true)
    const token = await createSession(secret)
    return json(
      { ok: true },
      { headers: { 'set-cookie': sessionCookie(token, secureCookie) } }
    )
  }

  if (path === '/admin/logout' && method === 'POST') {
    return json({ ok: true }, { headers: { 'set-cookie': clearCookie(secureCookie) } })
  }

  if (path === '/admin/session' && method === 'GET') {
    const cookies = parseCookies(request.headers.get('cookie'))
    const session = await readSession(secret, cookies[SESSION_COOKIE])
    return json({ authenticated: !!session })
  }

  // --------------------------------------------------------- admin (guarded)
  const cookies = parseCookies(request.headers.get('cookie'))
  const session = await readSession(secret, cookies[SESSION_COOKIE])
  if (!session) return fail('Unauthorized', 401)

  if (path === '/admin/content' && method === 'GET') {
    return json(await repo.getContent(true))
  }

  if (path === '/admin/settings' && method === 'PUT') {
    const body = await readJson(request)
    const patch = sanitizeSettings(body)
    if (!Object.keys(patch).length) return fail('Nothing to update', 400)
    const settings = await repo.saveSettings(patch)
    return json({ ok: true, settings })
  }

  if (path === '/admin/memories' && method === 'POST') {
    const body = (await readJson(request)) || {}
    const id = await repo.createMemory({
      title: body.title,
      body: body.body,
      date: body.date,
      trackId: body.trackId,
      visible: body.visible,
    })
    return json({ ok: true, id })
  }

  if (path === '/admin/memories/order' && method === 'PUT') {
    const body = await readJson(request)
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === 'string') : []
    await repo.reorderMemories(ids)
    return json({ ok: true })
  }

  const imageUpload = path.match(/^\/admin\/memories\/([^/]+)\/images$/)
  if (imageUpload && method === 'POST') {
    const memoryId = imageUpload[1]
    const result = await saveUpload(await parseForm(request), storage, 'image')
    if (result.error) return result.error
    const id = await repo.addImage(memoryId, { key: result.key, caption: result.caption })
    if (!id) {
      await storage.delete(result.key)
      return fail('Memory not found', 404)
    }
    return json({ ok: true, image: { id, key: result.key, url: `/api/media/${result.key}` } })
  }

  const memoryId = path.match(/^\/admin\/memories\/([^/]+)$/)
  if (memoryId && method === 'PUT') {
    const body = (await readJson(request)) || {}
    const patch = {}
    if (typeof body.title === 'string') patch.title = body.title.slice(0, 300)
    if (typeof body.body === 'string') patch.body = body.body.slice(0, 8000)
    if (typeof body.date === 'string') patch.date = body.date.slice(0, 40)
    if (body.trackId === null || typeof body.trackId === 'string') patch.trackId = body.trackId
    if (body.visible !== undefined) patch.visible = !!body.visible
    if (typeof body.sort === 'number') patch.sort = body.sort
    const ok = await repo.updateMemory(memoryId[1], patch)
    return ok ? json({ ok: true }) : fail('Memory not found', 404)
  }

  if (memoryId && method === 'DELETE') {
    const keys = await repo.deleteMemory(memoryId[1])
    await Promise.all((keys || []).map((k) => storage.delete(k)))
    return json({ ok: true })
  }

  const imageId = path.match(/^\/admin\/images\/([^/]+)$/)
  if (imageId && method === 'DELETE') {
    const key = await repo.deleteImage(imageId[1])
    if (key) await storage.delete(key)
    return json({ ok: true })
  }

  if (path === '/admin/tracks' && method === 'POST') {
    const type = request.headers.get('content-type') || ''
    if (type.includes('multipart/form-data')) {
      const form = await parseForm(request)
      const result = await saveUpload(form, storage, 'audio')
      if (result.error) return result.error
      const title = form ? String(form.get('title') || '') : ''
      const id = await repo.createTrack({ title: title || 'Untitled track', key: result.key })
      return json({ ok: true, id })
    }
    const body = (await readJson(request)) || {}
    if (body.url !== 'ambient:') return fail('Only ambient tracks can be created without a file', 400)
    const id = await repo.createTrack({ title: body.title || 'Night ambience', url: 'ambient:' })
    return json({ ok: true, id })
  }

  const trackId = path.match(/^\/admin\/tracks\/([^/]+)$/)
  if (trackId && method === 'PUT') {
    const body = (await readJson(request)) || {}
    const patch = {}
    if (typeof body.title === 'string') patch.title = body.title.slice(0, 200)
    if (body.isDefault !== undefined) patch.isDefault = !!body.isDefault
    if (typeof body.sort === 'number') patch.sort = body.sort
    const ok = await repo.updateTrack(trackId[1], patch)
    return ok ? json({ ok: true }) : fail('Track not found', 404)
  }

  if (trackId && method === 'DELETE') {
    const key = await repo.deleteTrack(trackId[1])
    if (key) await storage.delete(key)
    return json({ ok: true })
  }

  return fail('Not found', 404)
}
