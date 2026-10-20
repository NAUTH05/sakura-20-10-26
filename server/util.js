/**
 * Small shared helpers for the API layer.
 * Runs unchanged in Cloudflare Workers and in Node 18+ (Vite dev middleware).
 */

const encoder = new TextEncoder()

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

export function fail(message, status = 400) {
  return json({ error: message }, { status })
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nowISO() {
  return new Date().toISOString()
}

export function parseCookies(header) {
  const out = {}
  if (!header) return out
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=')
    if (idx === -1) return
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  })
  return out
}

function toBase64Url(bytes) {
  let bin = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(str) {
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : ''
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return toBase64Url(sig)
}

export const SESSION_COOKIE = 'sakura_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12

export async function createSession(secret) {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS }))
  )
  return `${payload}.${await hmac(secret, payload)}`
}

export async function readSession(secret, token) {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = await hmac(secret, payload)
  if (!timingSafeEqual(sig, expected)) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)))
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

/** Constant-time-ish string comparison. */
export function timingSafeEqual(a = '', b = '') {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function sha256Hex(value) {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function sessionCookie(token, secure) {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookie(secure) {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function clientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'local'
  )
}
