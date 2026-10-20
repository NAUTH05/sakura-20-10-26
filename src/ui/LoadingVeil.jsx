import { useEffect, useState } from 'react'

/** Soft loading veil — hides the first shader compile and the content fetch. */
export default function LoadingVeil({ ready }) {
  const [minDone, setMinDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 1300)
    return () => clearTimeout(t)
  }, [])

  const done = ready && minDone

  return (
    <div className={`intro ${done ? 'intro--done' : ''}`} aria-hidden={done}>
      <div className="intro__inner">
        <div className="intro__kicker">Interactive 3D diorama</div>
        <h2>Our Little Dream</h2>
        <p>夜桜 · 夜の散歩道</p>
        <div className="intro__bar">
          <i />
        </div>
      </div>
    </div>
  )
}
