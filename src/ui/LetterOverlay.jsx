import { useStore } from '../store/useStore'

/** Final beat: the couple wakes up and the letter appears. */
export default function LetterOverlay() {
  const stage = useStore((s) => s.stage)
  const settings = useStore((s) => s.content.settings)
  const setStage = useStore((s) => s.setStage)
  const setCameraMode = useStore((s) => s.setCameraMode)

  const open = stage === 'letter'

  const close = () => {
    setCameraMode(settings.defaultCamera || 'overview')
    setStage('explore')
  }

  return (
    <div className={`letter ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="letter__inner">
        <span className="letter__kicker">{settings.specialDate}</span>
        <span className="letter__heart" aria-hidden>♡</span>
        <p className="letter__text">{settings.letter}</p>
        <button className="letter__button" type="button" onClick={close} tabIndex={open ? 0 : -1}>
          Ở lại thêm chút nữa
        </button>
      </div>
    </div>
  )
}
