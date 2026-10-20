import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { player } from '../audio/player'
import { IconLoop, IconNext, IconNote, IconPause, IconPlay, IconPrev } from './musicIcons'

/**
 * Music settings for Dream Memories.
 *
 * Rendered as a third column inside the scrapbook on desktop and as a block
 * below the letter on mobile — it never floats over the photos or the text.
 */
export default function DreamMusicPanel() {
  const music = useStore((s) => s.music)
  const tracks = useStore((s) => s.content.tracks)

  const dreamTracks = useMemo(
    () => tracks.filter((t) => (t.scope || 'both') === 'both' || t.scope === 'dream'),
    [tracks]
  )

  const current =
    dreamTracks.find((t) => t.id === music.trackId) || dreamTracks[0] || null
  const muted = music.dreamMuted

  return (
    <aside className="dream-music" aria-label="Nhạc khi đọc thư">
      <header className="dream-music__head">
        <span className="dream-music__kicker">Dream music</span>
      </header>

      <div className="dream-music__now">
        <span className="dream-music__note" aria-hidden>
          <IconNote size={14} />
        </span>
        <div>
          <strong>{current ? current.title : 'Chưa có bài nào'}</strong>
          <small>{muted ? 'Đang tắt khi đọc thư' : music.playing ? 'Đang phát' : 'Tạm dừng'}</small>
        </div>
      </div>

      <div className="dream-music__controls">
        <button type="button" onClick={() => player.prev()} aria-label="Bài trước" disabled={!dreamTracks.length || muted}>
          <IconPrev />
        </button>
        <button
          type="button"
          className="dream-music__play"
          onClick={() => player.toggle()}
          aria-label={music.playing ? 'Tạm dừng' : 'Phát'}
          disabled={!dreamTracks.length || muted}
        >
          {music.playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" onClick={() => player.next()} aria-label="Bài tiếp" disabled={!dreamTracks.length || muted}>
          <IconNext />
        </button>
        <button
          type="button"
          className={`dream-music__loop ${music.loop ? 'is-on' : ''}`}
          onClick={() => player.setLoop(!music.loop)}
          aria-label="Lặp lại bài hát"
          aria-pressed={music.loop}
        >
          <IconLoop />
        </button>
      </div>

      <label className="dream-music__volume">
        <span>Âm lượng</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={music.dreamVolume}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          disabled={muted}
        />
        <em>{Math.round(music.dreamVolume * 100)}</em>
      </label>

      <div className="dream-music__list">
        <span className="dream-music__label">Playlist</span>
        {dreamTracks.length ? (
          <ul>
            {dreamTracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`dream-music__track ${t.id === current?.id ? 'is-active' : ''}`}
                  onClick={() => player.setDreamTrack(t.id)}
                  disabled={muted}
                >
                  <span className="dream-music__dot" aria-hidden />
                  <span className="dream-music__title">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dream-music__empty">
            Chưa có bài nào cho phần đọc thư. Thêm trong <code>/admin</code> → Dream Music.
          </p>
        )}
      </div>

      <button
        type="button"
        className={`dream-music__mute ${muted ? 'is-on' : ''}`}
        onClick={() => player.setDreamMuted(!muted)}
        aria-pressed={muted}
      >
        <span className="dream-music__switch" aria-hidden>
          <i />
        </span>
        Tắt nhạc khi đọc thư
      </button>

      {music.error && <p className="dream-music__error">{music.error}</p>}
    </aside>
  )
}
