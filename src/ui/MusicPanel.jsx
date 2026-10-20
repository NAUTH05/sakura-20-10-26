import { useStore } from '../store/useStore'
import { player } from '../audio/player'
import { IconLoop, IconNext, IconPlay, IconPause, IconPrev } from './musicIcons'

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
            value={music.cityVolume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
          />
          <em>{Math.round(music.cityVolume * 100)}</em>
        </label>

        {hasTracks ? (
          <ul className="music-panel__list">
            {music.tracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`music-panel__track ${t.id === music.trackId ? 'is-active' : ''}`}
                  onClick={() => player.play(t.id)}
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
