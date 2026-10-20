import { handleApi } from '../../server/api.js'
import { createD1Repo } from '../../server/repo/d1.js'
import { createR2Storage } from '../../server/storage/r2.js'

/**
 * Cloudflare Pages Function — every /api/* request lands here.
 * Bindings: DB (D1), MEDIA (R2), ADMIN_PASSWORD + SESSION_SECRET (secrets).
 */
export const onRequest = async ({ request, env }) => {
  const repo = createD1Repo(env.DB)
  const storage = createR2Storage(env.MEDIA)
  return handleApi(request, { repo, storage, env })
}
