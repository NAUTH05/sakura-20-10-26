import path from 'node:path'
import { createFileRepo } from './server/repo/file.js'
import { createFsStorage } from './server/storage/fs.js'
import { handleApi } from './server/api.js'
import { toWebRequest, sendWebResponse } from './server/node-http.js'

/**
 * Serves /api/* in `vite dev` and `vite preview` using the same handler that
 * runs on Cloudflare Pages Functions and on the production Node server.
 */
export function sakuraApi({ dataDir = '.data' } = {}) {
  const root = path.resolve(process.cwd(), dataDir)
  let repo = null
  let storage = null

  const ctx = () => {
    if (!repo) {
      repo = createFileRepo(root)
      storage = createFsStorage(path.join(root, 'uploads'))
    }
    return {
      repo,
      storage,
      env: {
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'sakura',
        SESSION_SECRET: process.env.SESSION_SECRET || 'mini-sakura-city-dev-secret',
        DEV: true,
      },
    }
  }

  const middleware = async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/')) return next()

    try {
      const origin = `http://${req.headers.host || 'localhost:5173'}`
      const request = await toWebRequest(req, origin)
      const response = await handleApi(request, ctx())
      await sendWebResponse(res, response)
    } catch (err) {
      console.error('[sakura api]', err)
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }

  return {
    name: 'sakura-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
