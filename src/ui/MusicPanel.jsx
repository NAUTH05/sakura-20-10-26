import { useStore } from '../store/useStore'
import { player } from '../audio/player'

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
)
const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
    <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
  </svg>
)
const IconPrev = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18 5.5v13L9 12l9-6.5Z" />
    <rect x="5" y="5.5" width="2.4" height="13" rx="1" />
  </svg>
)
const IconNext = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M6 5.5v13L15 12 6 5.5Z" />
    <rect x="16.6" y="5.5" width="2.4" height="13" rx="1" />
  </svg>
)
const IconLoop = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 9a5 5 0 0 1 5-5h9m0 0-3-3m3 3-3 3M20 15a5 5 0 0 1-5 5H6m0 0 3 3m-3-3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Playlist / volume / loop controls. */
export default function MusicPanel() {
  const open = useStore((s) => s.musicPanelOpen)
  const setOpen = useStore((s) => s.setMusicPanelOpen)
  const music = useStore((s) => s.music)

  const track = music.tracks.find((t) => t.id === music.trackId) || music.tracks[0]
  const hasTracks = music.tracks.length > 0

  return (
    <>
      <div className={`music-scrim ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`music-panel ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <header className="music-panel__head">
          <div>
            <span className="music-panel__kicker">Music</span>
            <h3>{track ? track.title : 'Chưa có bài nào'}</h3>
          </div>
          <button className="music-panel__close" type="button" onClick={() => setOpen(false)} aria-label="Đóng">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="music-panel__controls">
          <button type="button" onClick={() => player.prev()} aria-label="Bài trước" disabled={!hasTracks}>
            <IconPrev />
          </button>
          <button
            type="button"
            className="music-panel__play"
            onClick={() => player.toggle()}
            aria-label={music.playing ? 'Tạm dừng' : 'Phát'}
            disabled={!hasTracks}
          >
            {music.playing ? <IconPause /> : <IconPlay />}
          </button>
          <button type="button" onClick={() => player.next()} aria-label="Bài tiếp" disabled={!hasTracks}>
            <IconNext />
          </button>
          <button
            type="button"
            className={`music-panel__loop ${music.loop ? 'is-on' : ''}`}
            onClick={() => player.setLoop(!music.loop)}
            aria-label="Lặp lại"
            aria-pressed={music.loop}
          >
            <IconLoop />
          </button>
        </div>

        <label className="music-panel__volume">
          <span>Âm lượng</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={music.volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
          />
          <em>{Math.round(music.volume * 100)}</em>
        </label>

        {hasTracks ? (
          <ul className="music-panel__list">
            {music.tracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`music-panel__track ${t.id === music.trackId ? 'is-active' : ''}`}
                  onClick={() => player.load(t.id, { autoplay: true })}
                >
                  <span className="music-panel__track-dot" aria-hidden />
                  <span className="music-panel__track-title">{t.title}</span>
                  {t.isDefault && <span className="music-panel__badge">default</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="music-panel__empty">
            Chưa có bài nào. Tải nhạc lên trong <code>/admin</code> → Music.
          </p>
        )}

        {music.error && <p className="music-panel__error">{music.error}</p>}
      </aside>
    </>
  )
}
