/**
 * Production server for PM2.
 *
 * Serves the Vite build (dist/) and the /api routes with the same handlers used
 * by Cloudflare Pages Functions, backed by the local JSON store + disk uploads.
 * Only Node built-ins — no extra framework.
 */

import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { handleApi } from './api.js'
import { createFileRepo } from './repo/file.js'
import { createFsStorage } from './storage/fs.js'
import { toWebRequest, sendWebResponse } from './node-http.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')

/** Minimal .env loader (no dependency). Existing env vars win. */
function loadEnv(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  } catch {
    /* no .env — fine */
  }
}

loadEnv(path.join(ROOT, '.env'))

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || '.data')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const repo = createFileRepo(DATA_DIR)
const storage = createFsStorage(path.join(DATA_DIR, 'uploads'))
const env = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  SESSION_SECRET: process.env.SESSION_SECRET,
  DEV: false,
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`[sakura] dist/index.html not found. Run "npm run build" first.`)
  process.exit(1)
}

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    '[sakura] WARNING: ADMIN_PASSWORD is not set — falling back to the development password. ' +
      'Set it in .env before exposing /admin.'
  )
}
if (!process.env.SESSION_SECRET) {
  console.warn('[sakura] WARNING: SESSION_SECRET is not set — sessions use an insecure default.')
}

function contentTypeFor(file) {
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    return res.end('Method Not Allowed')
  }

  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    res.writeHead(400)
    return res.end('Bad Request')
  }

  if (pathname.endsWith('/')) pathname += 'index.html'

  const resolved = path.resolve(DIST, '.' + pathname)
  if (resolved !== DIST && !resolved.startsWith(DIST + path.sep)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  let file = resolved
  let stat = null
  try {
    stat = await fsp.stat(file)
    if (stat.isDirectory()) {
      file = path.join(file, 'index.html')
      stat = await fsp.stat(file)
    }
  } catch {
    stat = null
  }

  // SPA fallback for client routes such as /admin
  if (!stat) {
    if (path.extname(pathname)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('Not Found')
    }
    file = path.join(DIST, 'index.html')
    stat = await fsp.stat(file)
  }

  const isHtml = file.endsWith('.html')
  const isHashedAsset = pathname.startsWith('/assets/')

  res.setHeader('content-type', contentTypeFor(file))
  res.setHeader('content-length', String(stat.size))
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader(
    'cache-control',
    isHtml ? 'no-cache' : isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'
  )

  if (req.method === 'HEAD') return res.end()

  const stream = fs.createReadStream(file)
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500)
    res.end()
  })
  stream.pipe(res)
}

async function serveApi(req, res, origin) {
  const request = await toWebRequest(req, origin)
  const response = await handleApi(request, { repo, storage, env })

  // byte ranges so the audio element can seek
  const range = req.headers.range
  if (range && response.status === 200) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (match) {
      const buffer = Buffer.from(await response.arrayBuffer())
      const size = buffer.length
      let start = match[1] ? Number.parseInt(match[1], 10) : 0
      let end = match[2] ? Number.parseInt(match[2], 10) : size - 1
      if (!Number.isFinite(start) || start < 0) start = 0
      if (!Number.isFinite(end) || end >= size) end = size - 1

      if (start > end || start >= size) {
        res.writeHead(416, { 'content-range': `bytes */${size}` })
        return res.end()
      }

      const chunk = buffer.subarray(start, end + 1)
      res.writeHead(206, {
        'content-type': response.headers.get('content-type') || 'application/octet-stream',
        'content-length': String(chunk.length),
        'content-range': `bytes ${start}-${end}/${size}`,
        'accept-ranges': 'bytes',
        'cache-control': response.headers.get('cache-control') || 'public, max-age=31536000',
      })
      return res.end(chunk)
    }
  }

  await sendWebResponse(res, response)
}

const server = http.createServer(async (req, res) => {
  const origin = `http://${req.headers.host || `localhost:${PORT}`}`
  try {
    const url = new URL(req.url || '/', origin)
    if (url.pathname.startsWith('/api/')) {
      await serveApi(req, res, origin)
    } else {
      await serveStatic(req, res, url)
    }
  } catch (err) {
    console.error('[sakura] request failed:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    }
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[sakura] Our Little Dream listening on http://${HOST}:${PORT}`)
  console.log(`[sakura] static: ${DIST}`)
  console.log(`[sakura] data:   ${DATA_DIR}`)
})

function shutdown(signal) {
  console.log(`[sakura] ${signal} received, closing…`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
