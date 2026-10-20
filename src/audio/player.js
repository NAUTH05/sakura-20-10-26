import { ambient } from './ambient'

const VOLUME_KEY = 'sakura.volume'
const LOOP_KEY = 'sakura.loop'

const readNumber = (key, fallback) => {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback
}

const readBool = (key, fallback) => {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  return raw === null ? fallback : raw === '1'
}

/**
 * Playlist player.
 *
 * Plays uploaded MP3s through an <audio> element and falls back to the
 * procedural night ambience for the built-in `ambient:` pseudo track.
 * Never starts audio on its own — only in response to a user gesture.
 */
class MusicPlayer {
  constructor() {
    this.audio = typeof Audio !== 'undefined' ? new Audio() : null
    if (this.audio) {
      this.audio.preload = 'metadata'
      this.audio.addEventListener('ended', () => this.onEnded())
      this.audio.addEventListener('error', () => this.onError())
      this.audio.addEventListener('loadedmetadata', () => this.emit())
    }
    this.tracks = []
    this.currentId = null
    this.playing = false
    this.loop = readBool(LOOP_KEY, true)
    this.volume = readNumber(VOLUME_KEY, 0.55)
    this.ducked = false
    this.error = null
    this.listeners = new Set()
    this.applyVolume()
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    const snapshot = this.snapshot()
    this.listeners.forEach((fn) => fn(snapshot))
  }

  snapshot() {
    return {
      playing: this.playing,
      trackId: this.currentId,
      volume: this.volume,
      loop: this.loop,
      error: this.error,
      tracks: this.tracks,
      duration: this.audio?.duration || 0,
      time: this.audio?.currentTime || 0,
    }
  }

  setTracks(tracks, preferredId) {
    this.tracks = tracks || []
    const exists = this.tracks.some((t) => t.id === this.currentId)
    if (!exists) {
      const fallback =
        this.tracks.find((t) => t.id === preferredId) ||
        this.tracks.find((t) => t.isDefault) ||
        this.tracks[0]
      this.currentId = fallback ? fallback.id : null
      if (this.audio) this.audio.src = ''
    }
    this.emit()
  }

  current() {
    return this.tracks.find((t) => t.id === this.currentId) || null
  }

  applyVolume() {
    const effective = this.ducked ? this.volume * 0.45 : this.volume
    if (this.audio) this.audio.volume = Math.min(1, Math.max(0, effective))
    ambient.setVolume(Math.min(1, Math.max(0.0001, effective)))
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v))
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume))
    } catch {
      /* private mode */
    }
    this.applyVolume()
    this.emit()
  }

  setLoop(v) {
    this.loop = !!v
    try {
      localStorage.setItem(LOOP_KEY, this.loop ? '1' : '0')
    } catch {
      /* private mode */
    }
    this.emit()
  }

  setDucked(v) {
    if (this.ducked === !!v) return
    this.ducked = !!v
    this.applyVolume()
  }

  async load(trackId, { autoplay = false } = {}) {
    const track = this.tracks.find((t) => t.id === trackId)
    if (!track) return false
    this.currentId = track.id
    this.error = null

    if (track.url === 'ambient:') {
      if (this.audio) {
        this.audio.pause()
        this.audio.removeAttribute('src')
      }
      if (autoplay || this.playing) {
        await ambient.start()
        this.playing = true
      }
      this.emit()
      return true
    }

    ambient.stop()
    if (!this.audio) return false
    if (this.audio.src !== new URL(track.url, location.href).href) {
      this.audio.src = track.url
    }
    if (autoplay) {
      try {
        await this.audio.play()
        this.playing = true
        this.error = null
      } catch (err) {
        this.playing = false
        this.error =
          err?.name === 'NotAllowedError'
            ? 'Nhấn play để bật nhạc'
            : 'Không phát được bài này'
      }
    }
    this.emit()
    return this.playing
  }

  async play(trackId) {
    if (trackId && trackId !== this.currentId) {
      return this.load(trackId, { autoplay: true })
    }
    const track = this.current()
    if (!track) return false
    if (track.url === 'ambient:') {
      await ambient.start()
      this.playing = true
      this.emit()
      return true
    }
    try {
      await this.audio.play()
      this.playing = true
      this.error = null
    } catch (err) {
      this.playing = false
      this.error =
        err?.name === 'NotAllowedError' ? 'Nhấn play để bật nhạc' : 'Không phát được bài này'
    }
    this.emit()
    return this.playing
  }

  pause() {
    if (this.audio) this.audio.pause()
    ambient.stop()
    this.playing = false
    this.emit()
  }

  toggle() {
    return this.playing ? (this.pause(), Promise.resolve(false)) : this.play()
  }

  step(delta) {
    if (!this.tracks.length) return
    const idx = this.tracks.findIndex((t) => t.id === this.currentId)
    const nextIdx = (idx + delta + this.tracks.length) % this.tracks.length
    this.load(this.tracks[nextIdx].id, { autoplay: true })
  }

  next() {
    this.step(1)
  }

  prev() {
    this.step(-1)
  }

  onEnded() {
    if (this.loop) {
      this.audio.currentTime = 0
      this.audio.play().catch(() => {})
    } else {
      this.next()
    }
  }

  onError() {
    const track = this.current()
    if (!track || track.url === 'ambient:') return
    this.playing = false
    this.error = `Không tải được "${track.title}"`
    this.emit()
  }

  stopAll() {
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
    }
    ambient.stop()
    this.playing = false
    this.emit()
  }
}

export const player = new MusicPlayer()
