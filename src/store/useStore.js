import { create } from 'zustand'
import { api } from '../lib/api'
import { player } from '../audio/player'
import { DEFAULT_SETTINGS } from '../../shared/defaults.js'

const isTouch =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 820px)').matches || 'ontouchstart' in window)

const emptyContent = {
  settings: { ...DEFAULT_SETTINGS },
  memories: [],
  tracks: [],
}

/**
 * Single source of truth for the experience:
 * content, flow stage, camera, dream slides and music.
 */
export const useStore = create((set, get) => ({
  // ---------------------------------------------------------------- content
  content: emptyContent,
  contentReady: false,
  contentError: null,

  async loadContent() {
    try {
      const content = await api.content()
      set({
        content,
        contentReady: true,
        contentError: null,
        weather: content.settings.rain ? 'rain' : 'clear',
      })
      player.setTracks(content.tracks, content.settings.musicDefaultId)
      player.setVolume(content.settings.musicVolume ?? player.volume)
      return content
    } catch (err) {
      set({
        content: emptyContent,
        contentReady: true,
        contentError: err.message || 'Không tải được nội dung',
        weather: 'clear',
      })
      return null
    }
  },

  // ------------------------------------------------------------------ flow
  stage: 'welcome', // welcome | intro | explore | dream | waking | letter
  setStage: (stage) => set({ stage }),

  enterDream(index) {
    const { content } = get()
    const memories = content.memories || []
    if (!memories.length) {
      get().showToast('Chưa có kỷ niệm nào — thêm trong /admin nhé')
      return
    }
    const idx = Math.max(0, Math.min(index ?? get().dreamIndex, memories.length - 1))
    const memory = memories[idx]
    const musicState = player.snapshot()

    if (memory?.trackId && memory.trackId !== musicState.trackId) {
      player.load(memory.trackId, { autoplay: musicState.playing })
      set({ dreamMusicSwitched: true })
    } else {
      player.setDucked(true)
      set({ dreamMusicSwitched: false })
    }

    set({ stage: 'dream', dreamIndex: idx })
  },

  closeDream() {
    set({ stage: 'explore' })
    player.setDucked(false)
    if (get().dreamMusicSwitched) {
      const { content } = get()
      const fallback =
        content.tracks.find((t) => t.id === content.settings.musicDefaultId) ||
        content.tracks.find((t) => t.isDefault) ||
        content.tracks[0]
      if (fallback) player.load(fallback.id, { autoplay: player.snapshot().playing })
      set({ dreamMusicSwitched: false })
    }
  },

  wakeUp() {
    set({ stage: 'waking', wakeStartedAt: Date.now() })
    player.setDucked(false)
  },

  dreamIndex: 0,
  dreamMusicSwitched: false,
  wakeStartedAt: 0,

  setDreamIndex(index) {
    const memories = get().content.memories || []
    if (!memories.length) return
    const i = Math.max(0, Math.min(index, memories.length - 1))
    set({ dreamIndex: i })
    const memory = memories[i]
    const musicState = player.snapshot()
    if (memory?.trackId && memory.trackId !== musicState.trackId) {
      player.load(memory.trackId, { autoplay: musicState.playing })
      set({ dreamMusicSwitched: true })
    }
  },
  nextDream() {
    get().setDreamIndex(get().dreamIndex + 1)
  },
  prevDream() {
    get().setDreamIndex(get().dreamIndex - 1)
  },

  // ---------------------------------------------------------------- camera
  cameraMode: 'overview',
  setCameraMode: (cameraMode) => set({ cameraMode }),

  // ------------------------------------------------------------------- env
  weather: 'clear',
  setWeather: (weather) => set({ weather }),
  toggleWeather: () => set({ weather: get().weather === 'rain' ? 'clear' : 'rain' }),

  quality: isTouch ? 'medium' : 'high',
  setQuality: (quality) => set({ quality }),

  uiHidden: false,
  toggleUi: () => set({ uiHidden: !get().uiHidden }),
  setUiHidden: (uiHidden) => set({ uiHidden }),

  musicPanelOpen: false,
  setMusicPanelOpen: (musicPanelOpen) => set({ musicPanelOpen }),

  hoverCouple: false,
  setHoverCouple: (hoverCouple) => set({ hoverCouple }),

  toast: null,
  showToast: (message, tone = 'info') => {
    set({ toast: { message, tone, id: Date.now() } })
    setTimeout(() => {
      if (get().toast?.message === message) set({ toast: null })
    }, 3200)
  },

  // ---------------------------------------------------------------- music
  music: {
    playing: false,
    trackId: null,
    volume: 0.55,
    loop: true,
    error: null,
    tracks: [],
  },

  syncMusic() {
    const s = player.snapshot()
    set({
      music: {
        playing: s.playing,
        trackId: s.trackId,
        volume: s.volume,
        loop: s.loop,
        error: s.error,
        tracks: s.tracks,
      },
    })
  },

  async startMusic() {
    const { content } = get()
    const preferred =
      content.tracks.find((t) => t.id === content.settings.musicDefaultId) ||
      content.tracks.find((t) => t.isDefault) ||
      content.tracks[0]
    if (preferred) {
      await player.load(preferred.id, { autoplay: true })
    }
    get().syncMusic()
  },
}))

player.subscribe(() => {
  useStore.getState().syncMusic()
})
