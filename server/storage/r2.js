/** Cloudflare R2 storage binding. */
export function createR2Storage(bucket) {
  return {
    async put(key, body, contentType) {
      await bucket.put(key, body, {
        httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
      })
    },
    async get(key) {
      const obj = await bucket.get(key)
      if (!obj) return null
      return {
        body: obj.body,
        type: obj.httpMetadata?.contentType || 'application/octet-stream',
        etag: obj.httpEtag,
      }
    },
    async delete(key) {
      try {
        await bucket.delete(key)
      } catch {
        /* already gone */
      }
    },
  }
}
