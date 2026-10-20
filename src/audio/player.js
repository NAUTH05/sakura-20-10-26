import { ambient } from './ambient'

/**
 * Two-channel playlist player.
 *
 *  city  — plays while exploring Sakura City
 *  dream — plays while reading Dream Memories
 *
 * Both channels share ONE <audio> element (plus the procedural ambience for the
 * built-in `ambient:` track), so two songs can never play at the same time.
 * Switching channels fades the current track out, remembers its position, then
 * fades the other channel in. Nothing ever starts on its own — every call that
 * produces sound originates from a user gesture.
 */

const KEY = {
  cityVolume: 'sakura.volume.city',
  dreamVolume: 'sakura.volume.dream',
  loop: 'sakura.loop',
  dreamMuted: 'sakura.dream.muted',
  legacyVolume: 'sakura.volume',
}

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))

const readNumber = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    const n = Number(raw)
    return raw !== null && Number.isFinite(n) ? clamp(n) : fallback
  } catch {
    return fallback
  }
}

const readBool = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === '1'
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* private mode */
  }
}

const FADE_OUT_MS = 280
const FADE_IN_MS = 720

class MusicPlayer {
  constructor() {
    this.audio = typeof Audio !== 'undefined' ? new Audio() : null
    if (this.audio) {
      this.audio.preload = 'metadata'
      this.audio.addEventListener('ended', () => this.onEnded())
      this.audio.addEventListener('error', () => this.onError())
      this.audio.addEventListener('loadedmetadata', () => this.emit())
      this.audio.addEventListener('play', () => this.emit())
      this.audio.addEventListener('pause', () => this.emit())
    }

    this.tracks = []
    this.channel = 'city'
    this.cursor = { city: null, dream: null }
    this.position = { city: 0, dream: 0 }
    this.playing = { city: false, dream: false }
    this.volume = {
      city: readNumber(KEY.cityVolume, readNumber(KEY.legacyVolume, 0.55)),
      dream: readNumber(KEY.dreamVolume, readNumber(KEY.legacyVolume, 0.55)),
    }
    this.loop = readBool(KEY.loop, true)
    this.dreamMuted = readBool(KEY.dreamMuted, false)
    this.dreamAutoplay = true
    this.error = null
    this.userPaused = false
    this.resumeCityOnExit = false
    this.generation = 0
    this.fading = false
    this.retried = false
    this.listeners = new Set()

    this.audioEngine = this.audio ? 'audio' : 'none'
    this.applyVolume()
  }

  // ------------------------------------------------------------- observers
  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    const snap = this.snapshot()
    this.listeners.forEach((fn) => fn(snap))
  }

  snapshot() {
    return {
      mode: this.channel,
      playing: !!this.playing[this.channel],
      trackId: this.cursor[this.channel],
      volume: this.volume[this.channel],
      cityVolume: this.volume.city,
      dreamVolume: this.volume.dream,
      loop: this.loop,
      error: this.error,
      dreamMuted: this.dreamMuted,
      tracks: this.tracksFor(this.channel),
      cityTracks: this.tracksFor('city'),
      dreamTracks: this.tracksFor('dream'),
      duration: this.audio?.duration || 0,
      time: this.audio?.currentTime || 0,
    }
  }

  // --------------------------------------------------------------- library
  tracksFor(channel) {
    return this.tracks.filter((t) => (t.scope || 'both') === 'both' || t.scope === channel)
  }

  currentTrack(channel = this.channel) {
    const id = this.cursor[channel]
    return this.tracksFor(channel).find((t) => t.id === id) || null
  }

  defaultId(channel) {
    const list = this.tracksFor(channel)
    if (!list.length) return null
    const preferred = channel === 'dream' ? this.dreamDefaultId : this.cityDefaultId
    return (
      list.find((t) => t.id === preferred)?.id ||
      list.find((t) => t.isDefault)?.id ||
      list[0].id
    )
  }

  setTracks(tracks, options = {}) {
    this.tracks = Array.isArray(tracks) ? tracks : []
    this.cityDefaultId = options.cityDefaultId ?? this.cityDefaultId ?? null
    this.dreamDefaultId = options.dreamDefaultId ?? this.dreamDefaultId ?? null
    if (options.dreamAutoplay !== undefined) this.dreamAutoplay = !!options.dreamAutoplay
    if (options.cityVolume !== undefined && !readNumber(KEY.cityVolume, null)) {
      this.volume.city = clamp(options.cityVolume)
    }
    if (options.dreamVolume !== undefined) {
      // admin default only applies until the listener picks their own level
      if (localStorage && localStorage.getItem(KEY.dreamVolume) === null) {
        this.volume.dream = clamp(options.dreamVolume)
      }
    }

    for (const channel of ['city', 'dream']) {
      const list = this.tracksFor(channel)
      if (!list.some((t) => t.id === this.cursor[channel])) {
        this.cursor[channel] = this.defaultId(channel)
        this.position[channel] = 0
        if (channel === this.channel && this.playing[channel]) this.playing[channel] = false
      }
    }
    this.applyVolume()
    this.emit()
  }

  // ---------------------------------------------------------------- volume
  effectiveVolume() {
    return clamp(this.volume[this.channel])
  }

  applyVolume() {
    if (this.fading) return
    const v = this.effectiveVolume()
    if (this.audio) this.audio.volume = clamp(v)
    ambient.setVolume(clamp(v, 0.0001))
  }

  setVolume(v) {
    this.volume[this.channel] = clamp(v)
    write(this.channel === 'dream' ? KEY.dreamVolume : KEY.cityVolume, this.volume[this.channel])
    this.applyVolume()
    this.emit()
  }

  setLoop(v) {
    this.loop = !!v
    write(KEY.loop, this.loop ? '1' : '0')
    this.emit()
  }

  setDreamMuted(v) {
    this.dreamMuted = !!v
    write(KEY.dreamMuted, this.dreamMuted ? '1' : '0')
    if (this.channel === 'dream' && this.dreamMuted) {
      this.savePosition()
      this.stopEngines()
      this.playing.dream = false
    }
    this.emit()
  }

  // ------------------------------------------------------------------ fade
  async fadeTo(target, ms) {
    const gen = this.generation
    const audio = this.audio
    const from = audio ? audio.volume : 0
    const to = clamp(target)
    const start = performance.now()
    this.fading = true

    return new Promise((resolve) => {
      const tick = () => {
        if (gen !== this.generation) {
          this.fading = false
          resolve(false)
          return
        }
        const p = Math.min(1, (performance.now() - start) / Math.max(1, ms))
        const eased = p * p * (3 - 2 * p)
        const v = from + (to - from) * eased
        if (audio) audio.volume = clamp(v)
        ambient.setVolume(clamp(v, 0.0001))
        if (p < 1) requestAnimationFrame(tick)
        else {
          this.fading = false
          resolve(true)
        }
      }
      requestAnimationFrame(tick)
    })
  }

  // ------------------------------------------------------------- playback
  savePosition() {
    if (!this.audio) return
    if (this.audioEngine !== 'audio') return
    if (Number.isFinite(this.audio.currentTime)) {
      this.position[this.channel] = this.audio.currentTime
    }
  }

  stopEngines() {
    if (this.audio) this.audio.pause()
    ambient.stop()
  }

  async loadIntoAudio(track, at = 0) {
    const audio = this.audio
    if (!audio) return
    const url = new URL(track.url, location.href).href
    if (audio.src !== url) {
      audio.src = url
      await new Promise((resolve) => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          audio.removeEventListener('loadedmetadata', finish)
          audio.removeEventListener('error', finish)
          clearTimeout(timer)
          resolve()
        }
        const timer = setTimeout(finish, 4000)
        audio.addEventListener('loadedmetadata', finish)
        audio.addEventListener('error', finish)
      })
    }
    if (at > 0) {
      try {
        const limit = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.3) : at
        audio.currentTime = Math.min(at, limit)
      } catch {
        /* not seekable yet */
      }
    }
  }

  /** Starts (or resumes) the current channel's track, without fading. */
  async startCurrent() {
    const track = this.currentTrack()
    if (!track) return false
    this.error = null

    if (track.url === 'ambient:') {
      this.audioEngine = 'ambient'
      if (this.audio) this.audio.pause()
      ambient.volume = Math.max(0.0001, this.effectiveVolume())
      const ok = await ambient.start()
      this.playing[this.channel] = !!ok
      this.emit()
      return this.playing[this.channel]
    }

    if (!this.audio) return false
    ambient.stop()
    this.audioEngine = 'audio'
    // when the channel is not already playing we are starting fresh (or coming
    // back from the other channel) — restore the exact position it was left at
    const at = this.playing[this.channel] ? 0 : this.position[this.channel] || 0
    await this.loadIntoAudio(track, at)
    this.audio.volume = 0

    try {
      await this.audio.play()
      this.playing[this.channel] = true
      this.error = null
      this.retried = false
    } catch (err) {
      this.playing[this.channel] = false
      this.error =
        err?.name === 'NotAllowedError'
          ? 'Nhấn play để bật nhạc'
          : `Không phát được "${track.title}"`
    }
    this.emit()
    return this.playing[this.channel]
  }

  /** Fades the active channel out, swaps channels, fades the new one in. */
  async transitionTo(channel, { trackId = null, autoplay = true } = {}) {
    const gen = ++this.generation
    const wasPlaying = !!this.playing[this.channel]

    if (wasPlaying) {
      await this.fadeTo(0, FADE_OUT_MS)
      if (gen !== this.generation) return
    }

    this.savePosition()
    this.stopEngines()
    this.playing[this.channel] = false
    this.channel = channel

    if (trackId) {
      // only a genuinely different song restarts from the beginning — coming
      // back to the scrapbook (or flipping pages) resumes where it was left
      if (trackId !== this.cursor[channel]) this.position[channel] = 0
      this.cursor[channel] = trackId
    }
    if (!this.cursor[channel]) this.cursor[channel] = this.defaultId(channel)

    if (!autoplay) {
      this.emit()
      return
    }

    const ok = await this.startCurrent()
    if (gen !== this.generation) return
    if (ok) await this.fadeTo(this.effectiveVolume(), FADE_IN_MS)
    this.emit()
  }

  // ------------------------------------------------------------ public API
  /** Called when the reader opens Dream Memories. */
  async enterDream({ trackId = null, autoplay = true, muted = false } = {}) {
    this.resumeCityOnExit = !!this.playing.city && !this.userPaused
    const shouldPlay = autoplay && !muted && !this.dreamMuted

    if (!shouldPlay) {
      const gen = ++this.generation
      await this.fadeTo(0, FADE_OUT_MS)
      if (gen !== this.generation) return
      this.savePosition()
      this.stopEngines()
      this.playing.city = false
      this.playing.dream = false
      this.channel = 'dream'
      this.cursor.dream = trackId || this.cursor.dream || this.defaultId('dream')
      this.emit()
      return
    }

    await this.transitionTo('dream', { trackId: trackId || this.defaultId('dream'), autoplay: true })
  }

  /** Called when the scrapbook closes (or the couple wakes up). */
  async exitDream() {
    const autoplay = this.resumeCityOnExit && !this.userPaused
    await this.transitionTo('city', { autoplay })
  }

  /** Change the song while reading — stays inside the dream channel. */
  async setDreamTrack(trackId, { force = false } = {}) {
    if (this.channel !== 'dream') {
      if (trackId !== this.cursor.dream) this.position.dream = 0
      this.cursor.dream = trackId
      return
    }

    // already the current song: never interrupt it, just resume if paused
    if (!force && trackId === this.cursor.dream) {
      if (!this.playing.dream && !this.dreamMuted) {
        const resumed = await this.startCurrent()
        if (resumed) await this.fadeTo(this.effectiveVolume(), FADE_IN_MS)
        this.emit()
      }
      return
    }

    const gen = ++this.generation
    if (this.playing.dream) {
      await this.fadeTo(0, 180)
      if (gen !== this.generation) return
    }
    this.stopEngines()
    this.cursor.dream = trackId
    this.position.dream = 0
    this.playing.dream = false
    if (this.dreamMuted) {
      this.emit()
      return
    }
    const ok = await this.startCurrent()
    if (gen !== this.generation) return
    if (ok) await this.fadeTo(this.effectiveVolume(), 520)
    this.emit()
  }

  async play(trackId) {
    this.userPaused = false
    if (trackId && trackId !== this.cursor[this.channel]) {
      this.cursor[this.channel] = trackId
      this.position[this.channel] = 0
    }
    const ok = await this.startCurrent()
    // startCurrent always resets the element to 0, so always fade back in —
    // otherwise switching songs while playing stays silent
    if (ok) await this.fadeTo(this.effectiveVolume(), FADE_IN_MS)
    this.emit()
    return ok
  }

  pause() {
    this.userPaused = true
    this.savePosition()
    this.stopEngines()
    this.playing[this.channel] = false
    this.emit()
  }

  toggle() {
    return this.playing[this.channel] ? (this.pause(), Promise.resolve(false)) : this.play()
  }

  step(delta) {
    const list = this.tracksFor(this.channel)
    if (!list.length) return
    const idx = list.findIndex((t) => t.id === this.cursor[this.channel])
    const nextIdx = (idx + delta + list.length) % list.length
    const id = list[nextIdx].id
    if (this.channel === 'dream') this.setDreamTrack(id)
    else this.play(id)
  }

  next() {
    this.step(1)
  }

  prev() {
    this.step(-1)
  }

  onEnded() {
    if (this.loop) {
      try {
        this.audio.currentTime = 0
        this.audio.play().catch(() => {})
      } catch {
        /* ignore */
      }
    } else {
      this.step(1)
    }
  }

  onError() {
    const track = this.currentTrack()
    if (!track || track.url === 'ambient:') return

    // a single silent retry — flaky networks abort media loads now and then
    if (!this.retried) {
      this.retried = true
      setTimeout(() => {
        if (this.currentTrack()?.id !== track.id) return
        this.startCurrent().then((ok) => {
          if (ok) this.fadeTo(this.effectiveVolume(), 400)
        })
      }, 400)
      return
    }

    this.playing[this.channel] = false
    this.error = `Không tải được "${track.title}"`
    this.emit()
  }

  stopAll() {
    this.generation += 1
    this.stopEngines()
    if (this.audio) this.audio.removeAttribute('src')
    this.playing.city = false
    this.playing.dream = false
    this.emit()
  }
}

export const player = new MusicPlayer()

// dev-only handle so the audio state can be inspected from the console
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__player = player
}
