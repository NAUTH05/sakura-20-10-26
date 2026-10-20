import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from './store/useStore'
import { QUALITY, PALETTE } from './config/site'
import Experience from './components/Experience'
import Hud from './ui/Hud'
import Welcome from './ui/Welcome'
import IntroLine from './ui/IntroLine'
import DreamOverlay from './ui/DreamOverlay'
import MusicPanel from './ui/MusicPanel'
import LetterOverlay from './ui/LetterOverlay'
import LoadingVeil from './ui/LoadingVeil'
import Toast from './ui/Toast'
import './index.css'

export default function App() {
  const quality = useStore((s) => s.quality)
  const q = QUALITY[quality]
  const loadContent = useStore((s) => s.loadContent)
  const contentReady = useStore((s) => s.contentReady)
  const contentError = useStore((s) => s.contentError)
  const stage = useStore((s) => s.stage)
  const setStage = useStore((s) => s.setStage)
  const showToast = useStore((s) => s.showToast)

  useEffect(() => {
    loadContent()
  }, [loadContent])

  useEffect(() => {
    if (contentError) showToast(contentError, 'error')
  }, [contentError, showToast])

  // the couple wakes up, then the letter fades in
  useEffect(() => {
    if (stage !== 'waking') return
    const t = setTimeout(() => setStage('letter'), 4800)
    return () => clearTimeout(t)
  }, [stage, setStage])

  return (
    <div className="app">
      <Canvas
        dpr={q.dpr}
        shadows="soft"
        gl={{
          antialias: false,
          alpha: false,
          stencil: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [46, 62, 104], fov: 36, near: 0.5, far: 700 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.6
          gl.setClearColor(PALETTE.night)
        }}
      >
        <Experience />
      </Canvas>

      <div className="scene-fade" aria-hidden />
      <Welcome />
      <IntroLine />
      <DreamOverlay />
      <MusicPanel />
      <LetterOverlay />
      <Hud />
      <Toast />
      <LoadingVeil ready={contentReady} />
    </div>
  )
}
