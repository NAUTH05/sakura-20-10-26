/**
 * Node <-> Web Request/Response adapter.
 *
 * The API handlers are written against the Fetch API so the same code runs in
 * Cloudflare Workers, in the Vite dev middleware and in the production Node
 * server. This module is the Node side of that bridge.
 */

const SKIP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'content-length',
  'proxy-connection',
])

export async function toWebRequest(req, origin) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = chunks.length ? Buffer.concat(chunks) : undefined

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || SKIP_HEADERS.has(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  return new Request(new URL(req.url, origin), {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  })
}

export async function sendWebResponse(res, response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  const buffer = Buffer.from(await response.arrayBuffer())
  res.setHeader('content-length', String(buffer.length))
  res.end(buffer)
}
