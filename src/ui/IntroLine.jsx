import { useStore } from '../store/useStore'

/** Short line that appears while the camera flies into the park. */
export default function IntroLine() {
  const stage = useStore((s) => s.stage)
  const settings = useStore((s) => s.content.settings)
  const open = stage === 'intro'

  return (
    <div className={`intro-line ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <span>{settings.introLine}</span>
    </div>
  )
}
