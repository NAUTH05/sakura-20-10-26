import { useEffect } from 'react'
import { useStore } from '../store/useStore'

const CAMERAS = [
  { id: 'overview', label: 'Overview', key: '1' },
  { id: 'road', label: 'Sakura Road', key: '2' },
  { id: 'cinematic', label: 'Cinematic', key: '3' },
]

const QUALITY_ORDER = ['high', 'medium', 'low']
const QUALITY_LABEL = { high: 'High', medium: 'Med', low: 'Low' }
const MODE_LABEL = { overview: 'Overview', road: 'Sakura Road', cinematic: 'Cinematic' }

function Equalizer({ on }) {
  return (
    <span className={`eq ${on ? 'is-on' : ''}`} aria-hidden>
      <i />
      <i />
      <i />
    </span>
  )
}

function IconQuality({ level }) {
  const bars = level === 'high' ? 3 : level === 'medium' ? 2 : 1
  return (
    <span className="bars" aria-hidden>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < bars ? 'is-on' : ''} />
      ))}
    </span>
  )
}

export default function Hud() {
  const stage = useStore((s) => s.stage)
  const cameraMode = useStore((s) => s.cameraMode)
  const setCameraMode = useStore((s) => s.setCameraMode)
  const quality = useStore((s) => s.quality)
  const setQuality = useStore((s) => s.setQuality)
  const weather = useStore((s) => s.weather)
  const setWeather = useStore((s) => s.setWeather)
  const music = useStore((s) => s.music)
  const musicPanelOpen = useStore((s) => s.musicPanelOpen)
  const setMusicPanelOpen = useStore((s) => s.setMusicPanelOpen)
  const uiHidden = useStore((s) => s.uiHidden)
  const toggleUi = useStore((s) => s.toggleUi)
  const enterDream = useStore((s) => s.enterDream)
  const memories = useStore((s) => s.content.memories)

  const visible = stage === 'explore' && !uiHidden

  const cycleQuality = () => {
    const i = QUALITY_ORDER.indexOf(quality)
    setQuality(QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length])
  }

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const s = useStore.getState()
      if (s.stage !== 'explore') return
      switch (e.key.toLowerCase()) {
        case '1':
          s.setCameraMode('overview')
          break
        case '2':
          s.setCameraMode('road')
          break
        case '3':
          s.setCameraMode('cinematic')
          break
        case 'w':
          s.toggleWeather()
          break
        case 'm':
          s.setMusicPanelOpen(!s.musicPanelOpen)
          break
        case 'h':
          s.toggleUi()
          break
        case 'q': {
          const idx = QUALITY_ORDER.indexOf(s.quality)
          s.setQuality(QUALITY_ORDER[(idx + 1) % QUALITY_ORDER.length])
          break
        }
        case 'escape':
          if (s.musicPanelOpen) s.setMusicPanelOpen(false)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className={`hud ${visible ? '' : 'hud--hidden'}`}>
        <header className="brand">
          <span className="brand__mark" aria-hidden />
          <div>
            <h1>Our Little Dream</h1>
            <p>夜桜 · a night walk through the park</p>
          </div>
        </header>

        <div className="stage">
          <span className="stage__kicker">Camera</span>
          <span className="stage__value">{MODE_LABEL[cameraMode]}</span>
        </div>

        <button
          className="dream-cta"
          type="button"
          onClick={() => enterDream(0)}
          disabled={!memories.length}
          title="Mở những kỷ niệm của chúng mình"
        >
          <span aria-hidden>♡</span> Our dream
        </button>

        <div className="hint">
          <span>Drag to orbit</span>
          <i />
          <span>Scroll to zoom</span>
        </div>

        <nav className="dock" aria-label="Scene controls">
          <div className="dock__group">
            {CAMERAS.map((c) => (
              <button
                key={c.id}
                type="button"
                data-active={cameraMode === c.id}
                onClick={() => setCameraMode(c.id)}
                title={`${c.label} (${c.key})`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="dock__group">
            <span className="dock__label">Weather</span>
            <button type="button" data-active={weather === 'clear'} onClick={() => setWeather('clear')} title="Clear night (W)">
              Clear
            </button>
            <button type="button" data-active={weather === 'rain'} onClick={() => setWeather('rain')} title="Rain (W)">
              Rain
            </button>
          </div>

          <div className="dock__group">
            <button
              type="button"
              data-active={musicPanelOpen}
              onClick={() => setMusicPanelOpen(!musicPanelOpen)}
              title="Music (M)"
            >
              <Equalizer on={music.playing} />
              Music
            </button>
            <button type="button" onClick={cycleQuality} title={`Graphics quality: ${QUALITY_LABEL[quality]} (Q)`}>
              <IconQuality level={quality} />
              {QUALITY_LABEL[quality]}
            </button>
            <button type="button" onClick={toggleUi} title="Hide interface (H)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              Hide UI
            </button>
          </div>
        </nav>
      </div>

      <button className={`restore ${uiHidden ? 'is-shown' : ''}`} type="button" onClick={toggleUi} title="Show interface (H)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </>
  )
}
