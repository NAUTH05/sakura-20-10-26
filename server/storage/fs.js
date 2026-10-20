import fs from 'node:fs/promises'
import path from 'node:path'

const TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
}

/** Local disk storage for development. */
export function createFsStorage(dir) {
  return {
    async put(key, body) {
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(path.join(dir, key), Buffer.from(body))
    },
    async get(key) {
      try {
        const buf = await fs.readFile(path.join(dir, key))
        const ext = key.split('.').pop().toLowerCase()
        return { body: buf, type: TYPES[ext] || 'application/octet-stream' }
      } catch {
        return null
      }
    },
    async delete(key) {
      try {
        await fs.unlink(path.join(dir, key))
      } catch {
        /* already gone */
      }
    },
  }
}
