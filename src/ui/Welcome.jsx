import { useStore } from '../store/useStore'

/** Opening invitation. Also the user gesture that unlocks audio. */
export default function Welcome() {
  const stage = useStore((s) => s.stage)
  const settings = useStore((s) => s.content.settings)
  const setStage = useStore((s) => s.setStage)
  const setCameraMode = useStore((s) => s.setCameraMode)
  const startMusic = useStore((s) => s.startMusic)

  const open = stage === 'welcome'

  const enter = async () => {
    setCameraMode(settings.defaultCamera || 'overview')
    setStage('intro')
    try {
      await startMusic()
    } catch {
      /* audio is optional */
    }
  }

  return (
    <div className={`welcome ${open ? 'is-open' : 'is-closed'}`} aria-hidden={!open}>
      <div className="welcome__glow" aria-hidden />
      <div className="welcome__inner">
        <span className="welcome__kicker">{settings.welcomeKicker}</span>
        <h1 className="welcome__title">{settings.welcomeTitle}</h1>
        <p className="welcome__subtitle">{settings.welcomeSubtitle}</p>
        <button className="welcome__enter" type="button" onClick={enter} tabIndex={open ? 0 : -1}>
          <span>{settings.welcomeButton || 'Enter'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p className="welcome__note">♫ Bật tai nghe nhé — có nhạc, có gió và hoa rơi</p>
      </div>
    </div>
  )
}
