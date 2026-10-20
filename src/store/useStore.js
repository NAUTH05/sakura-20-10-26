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
      player.setTracks(content.tracks, {
        cityDefaultId: content.settings.musicDefaultId,
        dreamDefaultId: content.settings.dreamMusicDefaultId,
        dreamAutoplay: content.settings.dreamMusicEnabled !== false,
        cityVolume: content.settings.musicVolume,
        dreamVolume: content.settings.dreamMusicVolume,
      })
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

    // city music fades out, the dream track fades in (its position is kept)
    player.enterDream({
      trackId: memory?.trackId || null,
      autoplay: content.settings.dreamMusicEnabled !== false,
    })

    set({ stage: 'dream', dreamIndex: idx })
  },

  /** Leaves the scrapbook and hands the music back to Sakura City. */
  leaveDream() {
    set({ stage: 'explore' })
    player.exitDream()
  },

  closeDream() {
    get().leaveDream()
  },

  wakeUp() {
    set({ stage: 'waking', wakeStartedAt: Date.now() })
  },

  dreamIndex: 0,
  wakeStartedAt: 0,

  setDreamIndex(index) {
    const memories = get().content.memories || []
    if (!memories.length) return
    const i = Math.max(0, Math.min(index, memories.length - 1))
    set({ dreamIndex: i })
    // a page may carry its own song; pages without one keep the current track
    const trackId = memories[i]?.trackId
    if (trackId) player.setDreamTrack(trackId)
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
    mode: 'city',
    playing: false,
    trackId: null,
    volume: 0.55,
    cityVolume: 0.55,
    dreamVolume: 0.55,
    loop: true,
    error: null,
    tracks: [],
    dreamMuted: false,
  },

  syncMusic() {
    const s = player.snapshot()
    set({
      music: {
        mode: s.mode,
        playing: s.playing,
        trackId: s.trackId,
        volume: s.volume,
        cityVolume: s.cityVolume,
        dreamVolume: s.dreamVolume,
        loop: s.loop,
        error: s.error,
        tracks: s.tracks,
        dreamMuted: s.dreamMuted,
      },
    })
  },

  async startMusic() {
    const { content } = get()
    const preferred =
      content.tracks.find((t) => t.id === content.settings.musicDefaultId) ||
      content.tracks.find((t) => t.isDefault) ||
      player.snapshot().tracks[0]
    if (preferred) {
      await player.play(preferred.id)
    }
    get().syncMusic()
  },
}))

player.subscribe(() => {
  useStore.getState().syncMusic()
})
