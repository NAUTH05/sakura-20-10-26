import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { CAMERA } from '../../config/site'
import { useStore } from '../../store/useStore'
import { easeInOut } from '../../utils/math'

const _pos = new THREE.Vector3()
const _look = new THREE.Vector3()

const OVERVIEW_TARGET = new THREE.Vector3(...CAMERA.overview.target)
const OVERVIEW_DIR = new THREE.Vector3(...CAMERA.overview.dir).normalize()
const OVERVIEW_DIR_MOBILE = new THREE.Vector3(...CAMERA.overview.dirMobile).normalize()

/**
 * Camera director.
 *
 * welcome / explore  → selected camera preset (overview, road)
 * intro              → scripted fly-through after "Enter"
 * dream / waking     → push in on the sleeping couple, hold the close-up
 * cinematic          → dolly along +X and arc back
 */
export default function CameraRig() {
  const controls = useRef()
  const { camera, size } = useThree()
  const cameraMode = useStore((s) => s.cameraMode)
  const stage = useStore((s) => s.stage)
  const setStage = useStore((s) => s.setStage)

  const transition = useRef(null)
  const progress = useRef(1)
  const from = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 36 })
  const lookAt = useRef(OVERVIEW_TARGET.clone())
  const cine = useRef({})
  const intro = useRef(null)
  const introDone = useRef(false)

  const aspect = size.width / Math.max(size.height, 1)
  const mobile = aspect < 0.95

  const overview = useMemo(() => {
    const a = Math.max(aspect, 0.4)
    const fov = mobile ? CAMERA.overview.fovMobile : CAMERA.overview.fov
    const fitWidth = mobile ? CAMERA.overview.fitWidthMobile : CAMERA.overview.fitWidth
    const vFov = (fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * a)
    const dist = Math.min((fitWidth / 2 / Math.tan(hFov / 2)) * 1.02, 190)
    const dir = mobile ? OVERVIEW_DIR_MOBILE : OVERVIEW_DIR
    const target = mobile
      ? new THREE.Vector3(...CAMERA.overview.targetMobile)
      : OVERVIEW_TARGET.clone()
    return {
      pos: target.clone().add(dir.clone().multiplyScalar(dist)),
      target,
      fov,
    }
  }, [aspect, mobile])

  const road = useMemo(
    () => ({
      pos: new THREE.Vector3(...CAMERA.road.position),
      target: new THREE.Vector3(...CAMERA.road.target),
      fov: mobile ? CAMERA.road.fovMobile : CAMERA.road.fov,
    }),
    [mobile]
  )

  const dreamView = useMemo(
    () => ({
      pos: new THREE.Vector3(...(mobile ? CAMERA.dream.positionMobile : CAMERA.dream.position)),
      target: new THREE.Vector3(...(mobile ? CAMERA.dream.targetMobile : CAMERA.dream.target)),
      fov: mobile ? CAMERA.dream.fovMobile : CAMERA.dream.fov,
    }),
    [mobile]
  )

  const wakeView = useMemo(
    () => ({
      pos: new THREE.Vector3(...(mobile ? CAMERA.wake.positionMobile : CAMERA.wake.position)),
      target: new THREE.Vector3(...(mobile ? CAMERA.wake.targetMobile : CAMERA.wake.target)),
      fov: mobile ? CAMERA.wake.fovMobile : CAMERA.wake.fov,
    }),
    [mobile]
  )

  const introRoad = useMemo(
    () => ({
      pos: new THREE.Vector3(...(mobile ? CAMERA.intro.roadMobile.position : CAMERA.intro.road.position)),
      target: new THREE.Vector3(...(mobile ? CAMERA.intro.roadMobile.target : CAMERA.intro.road.target)),
      fov: mobile ? CAMERA.intro.roadMobile.fov : CAMERA.intro.road.fov,
    }),
    [mobile]
  )

  const begin = (pos, target, fov, dur = 1.9) => {
    from.current.pos.copy(camera.position)
    from.current.target.copy(controls.current ? controls.current.target : target)
    from.current.fov = camera.fov
    transition.current = {
      pos: pos.clone(),
      target: target.clone(),
      fov,
      dur,
      start: performance.now(),
    }
    progress.current = 0
    if (controls.current) controls.current.enabled = false
  }

  useEffect(() => {
    if (!controls.current) return
    controls.current.target.copy(OVERVIEW_TARGET)
    controls.current.update()
  }, [])

  useEffect(() => {
    if (stage === 'intro') {
      intro.current = {
        start: performance.now(),
        fromPos: camera.position.clone(),
        fromLook: lookAt.current.clone(),
        fromFov: camera.fov,
      }
      introDone.current = false
      transition.current = null
      if (controls.current) controls.current.enabled = false
      return
    }

    if (stage === 'dream') {
      begin(dreamView.pos, dreamView.target, dreamView.fov, 1.7)
      return
    }

    if (stage === 'waking') {
      begin(wakeView.pos, wakeView.target, wakeView.fov, 1.3)
      return
    }

    if (stage === 'letter') return

    if (cameraMode === 'overview') begin(overview.pos, overview.target, overview.fov)
    else begin(road.pos, road.target, road.fov)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cameraMode])

  useEffect(() => {
    if (stage !== 'welcome' && stage !== 'explore') return
    if (!size.width) return
    if (cameraMode === 'overview') begin(overview.pos, overview.target, overview.fov, 1.0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview, stage])

  useFrame(() => {
    const c = controls.current
    const now = performance.now()

    // ------------------------------------------------------------- intro
    if (stage === 'intro' && intro.current) {
      const t = (now - intro.current.start) / 1000
      const legA = CAMERA.intro.firstLeg
      const legB = CAMERA.intro.secondLeg

      if (t < legA) {
        const p = easeInOut(t / legA)
        _pos.lerpVectors(intro.current.fromPos, introRoad.pos, p)
        _look.lerpVectors(intro.current.fromLook, introRoad.target, p)
        _pos.y += Math.sin(p * Math.PI) * 4
        camera.fov = intro.current.fromFov + (introRoad.fov - intro.current.fromFov) * p
      } else if (t < legA + legB) {
        const p = easeInOut((t - legA) / legB)
        _pos.lerpVectors(introRoad.pos, overview.pos, p)
        _look.lerpVectors(introRoad.target, overview.target, p)
        camera.fov = introRoad.fov + (overview.fov - introRoad.fov) * p
      } else {
        _pos.copy(overview.pos)
        _look.copy(overview.target)
        camera.fov = overview.fov
        if (!introDone.current) {
          introDone.current = true
          intro.current = null
          lookAt.current.copy(_look)
          camera.position.copy(_pos)
          camera.lookAt(lookAt.current)
          camera.updateProjectionMatrix()
          if (c) {
            c.target.copy(lookAt.current)
            c.enabled = true
          }
          setStage('explore')
          return
        }
      }

      camera.position.copy(_pos)
      lookAt.current.copy(_look)
      camera.lookAt(lookAt.current)
      camera.updateProjectionMatrix()
      if (c) {
        c.target.copy(lookAt.current)
        c.enabled = false
      }
      return
    }

    // --------------------------------------------------------- cinematic
    if (cameraMode === 'cinematic' && stage !== 'dream' && stage !== 'waking') {
      const cfg = CAMERA.cinematic
      if (cine.current.start == null) {
        cine.current.start = now
        cine.current.entry = now
        cine.current.from = camera.position.clone()
        cine.current.fromLook = lookAt.current.clone()
        cine.current.fromFov = camera.fov
      }
      const t = (now - cine.current.start) / 1000
      const total = cfg.travel + cfg.returnTime
      const tt = t > total ? 0 : t
      if (t > total) cine.current.start = now

      let x, y, z, lx, ly, lz
      if (tt <= cfg.travel) {
        const p = tt / cfg.travel
        x = cfg.fromX + (cfg.toX - cfg.fromX) * p
        y = cfg.height + Math.sin(p * Math.PI * 3) * 0.16
        z = Math.sin(p * Math.PI * 2.4) * 0.85
        lx = x + 8
        ly = 2.45 + Math.sin(p * Math.PI * 2) * 0.26
        lz = Math.sin(p * Math.PI * 1.6 + 0.7) * 1.0
      } else {
        const p = (tt - cfg.travel) / cfg.returnTime
        const e = easeInOut(p)
        x = cfg.toX - (cfg.toX - cfg.fromX) * e
        y = cfg.height + Math.sin(e * Math.PI) * 9
        z = Math.sin(e * Math.PI) * 5
        lx = x + 8
        ly = 2.45
        lz = 0
      }

      _pos.set(x, y, z)
      _look.set(lx, ly, lz)

      const blend = Math.min(1, (now - cine.current.entry) / 1500)
      const e = easeInOut(blend)
      camera.position.lerpVectors(cine.current.from, _pos, e)
      lookAt.current.lerpVectors(cine.current.fromLook, _look, e)

      camera.lookAt(lookAt.current)
      if (c) {
        c.target.copy(lookAt.current)
        c.enabled = false
      }
      camera.fov = cine.current.fromFov + (cfg.fov - cine.current.fromFov) * e
      camera.updateProjectionMatrix()
      return
    }

    if (cameraMode !== 'cinematic') cine.current = {}

    // -------------------------------------------------------- transitions
    const locked = stage === 'dream' || stage === 'waking' || stage === 'letter'
    if (c) c.enabled = !transition.current && !locked

    if (transition.current) {
      progress.current = Math.min(
        1,
        (now - transition.current.start) / 1000 / transition.current.dur
      )
      const e = easeInOut(progress.current)
      camera.position.lerpVectors(from.current.pos, transition.current.pos, e)
      lookAt.current.lerpVectors(from.current.target, transition.current.target, e)
      camera.fov = from.current.fov + (transition.current.fov - from.current.fov) * e
      camera.updateProjectionMatrix()
      // OrbitControls is disabled while locked, so aim the camera ourselves
      camera.lookAt(lookAt.current)
      if (c) c.target.copy(lookAt.current)

      if (progress.current >= 1) {
        transition.current = null
        if (c) c.enabled = !locked
      }
    }
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.055}
      rotateSpeed={0.55}
      zoomSpeed={0.85}
      panSpeed={0.6}
      minDistance={CAMERA.limits.minDistance}
      maxDistance={CAMERA.limits.maxDistance}
      minPolarAngle={0.14}
      maxPolarAngle={Math.PI / 2 - 0.035}
    />
  )
}
