import { DEFAULT_SETTINGS } from '../../shared/defaults.js'
import { uid, nowISO } from '../util.js'

const mediaUrl = (key) => `/api/media/${key}`

const trackUrl = (t) =>
  t.url && (t.url.startsWith('http') || t.url.startsWith('ambient:'))
    ? t.url
    : t.key
      ? mediaUrl(t.key)
      : t.url

/**
 * Cloudflare D1 repository. Same surface as the local file repository.
 */
export function createD1Repo(db) {
  const toMemory = (row) => ({
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    date: row.date || '',
    trackId: row.track_id || null,
    visible: !!row.visible,
    sort: row.sort || 0,
  })

  return {
    kind: 'd1',

    async getContent(includeHidden = false) {
      const [settingsRow, memRes, imgRes, trackRes] = await Promise.all([
        db.prepare('SELECT data FROM settings WHERE id = ?').bind('site').first(),
        db.prepare('SELECT * FROM memories ORDER BY sort ASC').all(),
        db.prepare('SELECT * FROM memory_images ORDER BY sort ASC').all(),
        db.prepare('SELECT * FROM tracks ORDER BY sort ASC').all(),
      ])

      let saved = {}
      try {
        saved = settingsRow?.data ? JSON.parse(settingsRow.data) : {}
      } catch {
        saved = {}
      }

      const images = (imgRes?.results || []).map((r) => ({
        id: r.id,
        memoryId: r.memory_id,
        key: r.key,
        caption: r.caption || '',
        sort: r.sort || 0,
      }))

      const memories = (memRes?.results || [])
        .map(toMemory)
        .filter((m) => includeHidden || m.visible)
        .map((m) => ({
          ...m,
          images: images
            .filter((i) => i.memoryId === m.id)
            .map((i) => ({
              id: i.id,
              key: i.key,
              caption: i.caption,
              url: mediaUrl(i.key),
            })),
        }))

      const tracks = (trackRes?.results || []).map((t) => ({
        id: t.id,
        title: t.title,
        key: t.key,
        url: trackUrl({ url: t.url, key: t.key }),
        isDefault: !!t.is_default,
        scope: t.scope || 'both',
        sort: t.sort || 0,
      }))

      return {
        settings: { ...DEFAULT_SETTINGS, ...saved },
        memories,
        tracks,
      }
    },

    async saveSettings(patch) {
      const current = await this.getContent(true)
      const next = { ...current.settings, ...patch }
      await db
        .prepare(
          'INSERT INTO settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data'
        )
        .bind('site', JSON.stringify(next))
        .run()
      return next
    },

    async createMemory(data) {
      const id = uid()
      const row = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS s FROM memories').first()
      const sort = (row?.s ?? -1) + 1
      await db
        .prepare(
          'INSERT INTO memories (id, title, body, date, track_id, visible, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          id,
          data.title || 'Untitled memory',
          data.body || '',
          data.date || '',
          data.trackId || null,
          data.visible === false ? 0 : 1,
          sort,
          nowISO()
        )
        .run()
      return id
    },

    async updateMemory(id, patch) {
      const fields = []
      const values = []
      const map = {
        title: 'title',
        body: 'body',
        date: 'date',
        trackId: 'track_id',
        visible: 'visible',
        sort: 'sort',
      }
      for (const [k, col] of Object.entries(map)) {
        if (patch[k] !== undefined) {
          fields.push(`${col} = ?`)
          values.push(k === 'visible' ? (patch[k] ? 1 : 0) : patch[k])
        }
      }
      if (!fields.length) return true
      values.push(id)
      await db
        .prepare(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run()
      return true
    },

    async deleteMemory(id) {
      const imgs = await db
        .prepare('SELECT key FROM memory_images WHERE memory_id = ?')
        .bind(id)
        .all()
      const keys = (imgs?.results || []).map((r) => r.key)
      await db.batch([
        db.prepare('DELETE FROM memory_images WHERE memory_id = ?').bind(id),
        db.prepare('DELETE FROM memories WHERE id = ?').bind(id),
      ])
      return keys
    },

    async reorderMemories(ids) {
      if (!ids.length) return true
      await db.batch(
        ids.map((id, i) => db.prepare('UPDATE memories SET sort = ? WHERE id = ?').bind(i, id))
      )
      return true
    },

    async addImage(memoryId, { key, caption = '' }) {
      const id = uid()
      const row = await db
        .prepare('SELECT COALESCE(MAX(sort), -1) AS s FROM memory_images WHERE memory_id = ?')
        .bind(memoryId)
        .first()
      await db
        .prepare(
          'INSERT INTO memory_images (id, memory_id, key, caption, sort) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(id, memoryId, key, caption, (row?.s ?? -1) + 1)
        .run()
      return id
    },

    async deleteImage(id) {
      const row = await db
        .prepare('SELECT key FROM memory_images WHERE id = ?')
        .bind(id)
        .first()
      await db.prepare('DELETE FROM memory_images WHERE id = ?').bind(id).run()
      return row?.key || null
    },

    async createTrack({ title, key = null, url = null, scope = 'both' }) {
      const id = uid()
      const row = await db.prepare('SELECT COALESCE(MAX(sort), -1) AS s FROM tracks').first()
      await db
        .prepare(
          'INSERT INTO tracks (id, title, key, url, scope, is_default, sort, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
        )
        .bind(id, title || 'Untitled track', key, url, scope, (row?.s ?? -1) + 1, nowISO())
        .run()
      return id
    },

    async updateTrack(id, patch) {
      const stmts = []
      if (patch.isDefault) {
        stmts.push(db.prepare('UPDATE tracks SET is_default = 0'))
        stmts.push(db.prepare('UPDATE tracks SET is_default = 1 WHERE id = ?').bind(id))
      }
      if (patch.title !== undefined) {
        stmts.push(db.prepare('UPDATE tracks SET title = ? WHERE id = ?').bind(patch.title, id))
      }
      if (patch.scope !== undefined) {
        stmts.push(db.prepare('UPDATE tracks SET scope = ? WHERE id = ?').bind(patch.scope, id))
      }
      if (!stmts.length) return true
      await db.batch(stmts)
      return true
    },

    async deleteTrack(id) {
      const row = await db.prepare('SELECT key, is_default FROM tracks WHERE id = ?').bind(id).first()
      await db.prepare('DELETE FROM tracks WHERE id = ?').bind(id).run()
      if (row?.is_default) {
        await db
          .prepare('UPDATE tracks SET is_default = 1 WHERE id = (SELECT id FROM tracks ORDER BY sort ASC LIMIT 1)')
          .run()
      }
      return row?.key || null
    },
  }
}
