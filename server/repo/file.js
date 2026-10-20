import fs from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_SETTINGS } from '../../shared/defaults.js'
import { makeSeedState, seedFiles } from '../seed.js'
import { uid, nowISO } from '../util.js'

const mediaUrl = (key) => `/api/media/${key}`

const trackUrl = (t) =>
  t.url && (t.url.startsWith('http') || t.url.startsWith('ambient:'))
    ? t.url
    : t.key
      ? mediaUrl(t.key)
      : t.url

/**
 * Local development repository: a single JSON document + uploads on disk.
 * Mirrors the D1 repository API so the same handlers run in both places.
 */
export function createFileRepo(dataDir) {
  const dbPath = path.join(dataDir, 'db.json')
  const uploadDir = path.join(dataDir, 'uploads')
  let state = null
  let queue = Promise.resolve()

  async function ensure() {
    if (state) return state
    await fs.mkdir(uploadDir, { recursive: true })
    try {
      state = JSON.parse(await fs.readFile(dbPath, 'utf8'))
    } catch {
      state = makeSeedState()
      await fs.writeFile(dbPath, JSON.stringify(state, null, 2))
      for (const f of seedFiles()) {
        await fs.writeFile(path.join(uploadDir, f.key), f.body)
      }
    }
    return state
  }

  function mutate(fn) {
    const run = queue.then(async () => {
      const s = await ensure()
      const result = await fn(s)
      await fs.writeFile(dbPath, JSON.stringify(s, null, 2))
      return result
    })
    queue = run.catch(() => {})
    return run
  }

  function build(s, includeHidden) {
    const tracks = s.tracks
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((t) => ({
        id: t.id,
        title: t.title,
        url: trackUrl(t),
        key: t.key,
        isDefault: !!t.isDefault,
        sort: t.sort,
      }))

    const memories = s.memories
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .filter((m) => includeHidden || m.visible)
      .map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        date: m.date || '',
        trackId: m.trackId || null,
        visible: !!m.visible,
        sort: m.sort,
        images: (m.images || [])
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((im) => ({
            id: im.id,
            key: im.key,
            caption: im.caption || '',
            url: mediaUrl(im.key),
          })),
      }))

    return {
      settings: { ...DEFAULT_SETTINGS, ...s.settings },
      memories,
      tracks,
    }
  }

  return {
    kind: 'file',

    async getContent(includeHidden = false) {
      return build(await ensure(), includeHidden)
    },

    async saveSettings(patch) {
      return mutate((s) => {
        s.settings = { ...s.settings, ...patch }
        return { ...DEFAULT_SETTINGS, ...s.settings }
      })
    },

    async createMemory(data) {
      return mutate((s) => {
        const sort = s.memories.reduce((m, x) => Math.max(m, x.sort), -1) + 1
        const memory = {
          id: uid(),
          title: data.title || 'Untitled memory',
          body: data.body || '',
          date: data.date || '',
          trackId: data.trackId || null,
          visible: data.visible !== false,
          sort,
          createdAt: nowISO(),
          images: [],
        }
        s.memories.push(memory)
        return memory.id
      })
    },

    async updateMemory(id, patch) {
      return mutate((s) => {
        const m = s.memories.find((x) => x.id === id)
        if (!m) return false
        for (const k of ['title', 'body', 'date', 'trackId', 'visible', 'sort']) {
          if (patch[k] !== undefined) m[k] = patch[k]
        }
        return true
      })
    },

    async deleteMemory(id) {
      return mutate((s) => {
        const idx = s.memories.findIndex((x) => x.id === id)
        if (idx === -1) return []
        const [removed] = s.memories.splice(idx, 1)
        return (removed.images || []).map((i) => i.key)
      })
    },

    async reorderMemories(ids) {
      return mutate((s) => {
        ids.forEach((id, i) => {
          const m = s.memories.find((x) => x.id === id)
          if (m) m.sort = i
        })
        return true
      })
    },

    async addImage(memoryId, { key, caption = '' }) {
      return mutate((s) => {
        const m = s.memories.find((x) => x.id === memoryId)
        if (!m) return null
        const sort = (m.images || []).reduce((a, x) => Math.max(a, x.sort), -1) + 1
        const image = { id: uid(), key, caption, sort }
        m.images = m.images || []
        m.images.push(image)
        return image.id
      })
    },

    async deleteImage(id) {
      return mutate((s) => {
        for (const m of s.memories) {
          const idx = (m.images || []).findIndex((i) => i.id === id)
          if (idx !== -1) {
            const [removed] = m.images.splice(idx, 1)
            return removed.key
          }
        }
        return null
      })
    },

    async createTrack({ title, key = null, url = null }) {
      return mutate((s) => {
        const sort = s.tracks.reduce((m, x) => Math.max(m, x.sort), -1) + 1
        const track = {
          id: uid(),
          title: title || 'Untitled track',
          key,
          url,
          isDefault: false,
          sort,
          createdAt: nowISO(),
        }
        s.tracks.push(track)
        return track.id
      })
    },

    async updateTrack(id, patch) {
      return mutate((s) => {
        if (patch.isDefault) s.tracks.forEach((t) => (t.isDefault = false))
        const t = s.tracks.find((x) => x.id === id)
        if (!t) return false
        if (patch.title !== undefined) t.title = patch.title
        if (patch.isDefault !== undefined) t.isDefault = !!patch.isDefault
        if (patch.sort !== undefined) t.sort = patch.sort
        return true
      })
    },

    async deleteTrack(id) {
      return mutate((s) => {
        const idx = s.tracks.findIndex((x) => x.id === id)
        if (idx === -1) return null
        const [removed] = s.tracks.splice(idx, 1)
        if (removed.isDefault && s.tracks[0]) s.tracks[0].isDefault = true
        return removed.key
      })
    },
  }
}
