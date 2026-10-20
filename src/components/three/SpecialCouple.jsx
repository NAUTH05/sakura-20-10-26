import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../store/useStore'
import { makeGlowTexture } from '../../utils/textures'

const BENCH = { x: 0.6, z: 4.05 }

/**
 * One seated person. Local space faces -Z (towards the road).
 * `side` is -1 for the boy (left) and +1 for the girl (right).
 */
function SeatedPerson({ side, variant = 'm', colors, wake, delay = 0 }) {
  const torso = useRef()
  const head = useRef()
  const hair = useRef()
  const chest = useRef()
  const closed = useRef()
  const open = useRef()
  const coatRef = useRef()

  const isF = variant === 'f'

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    const w = wake.current

    // breathing — always present, a little quicker once awake
    const breath = Math.sin(t * (1.05 + w * 0.5) + side) * (0.012 + w * 0.006)
    if (torso.current) {
      torso.current.scale.y = 1 + breath
      torso.current.position.y = 0.02 + breath * 0.4
    }
    if (chest.current) chest.current.scale.setScalar(1 + breath * 0.8)

    // head: resting together while asleep, lifting and turning on wake.
    // the head group sits at the centre of the skull, so rotating it alone only
    // spins the face — the heads have to travel towards each other as well.
    const girl = side > 0
    const sleepTilt = side * 0.22
    const sleepShift = -side * 0.07
    const sleepDrop = girl ? -0.03 : 0
    const sleepYaw = 0
    const wakeTilt = side * 0.02
    const wakeYaw = side * 0.52
    if (head.current) {
      head.current.position.x += (sleepShift * (1 - w) - head.current.position.x) * (1 - Math.exp(-dt * 3))
      head.current.rotation.z +=
        (sleepTilt + (wakeTilt - sleepTilt) * w - head.current.rotation.z) * (1 - Math.exp(-dt * 3))
      head.current.rotation.y +=
        (sleepYaw + (wakeYaw - sleepYaw) * w - head.current.rotation.y) * (1 - Math.exp(-dt * 3))
      head.current.rotation.x +=
        (0.04 + Math.sin(t * 0.7 + side) * 0.01 - head.current.rotation.x) * (1 - Math.exp(-dt * 3))
      head.current.position.y =
        0.585 + sleepDrop * (1 - w) + Math.sin(t * 1.05 + side) * 0.004 - w * 0.012
    }
    if (hair.current) {
      hair.current.rotation.z = Math.sin(t * 0.9 + side) * 0.02
      hair.current.rotation.x = Math.sin(t * 0.6 + side * 2) * 0.015
    }
    if (closed.current) {
      const s = Math.max(0.001, 1 - w)
      closed.current.scale.setScalar(s)
    }
    if (open.current) {
      open.current.scale.setScalar(Math.max(0.001, w))
    }
    if (coatRef.current) {
      const target = 0.02 + w * 0.06
      coatRef.current.emissiveIntensity += (target - coatRef.current.emissiveIntensity) * 0.1
    }
  })

  return (
    <group position={[side * 0.235, 0.47, 0]} rotation={[0, 0, side * 0.1]}>
      <group ref={torso}>
        {/* torso */}
        <mesh castShadow position={[0, 0.28, 0]}>
          <cylinderGeometry args={[isF ? 0.125 : 0.155, isF ? 0.165 : 0.17, 0.56, 9]} />
          <meshStandardMaterial
            ref={coatRef}
            color={colors.coat}
            roughness={0.8}
            emissive={colors.glow || '#ff9ecb'}
            emissiveIntensity={0.02}
            flatShading
          />
        </mesh>
        <mesh ref={chest} position={[0, 0.4, 0]} scale={[1, 0.62, 0.85]}>
          <sphereGeometry args={[0.175, 12, 8]} />
          <meshStandardMaterial color={colors.coat} roughness={0.82} flatShading />
        </mesh>

        {/* skirt / coat hem draped over the lap */}
        {isF && (
          <mesh castShadow position={[0, 0.03, -0.07]} rotation={[0.3, 0, 0]} scale={[1, 1, 0.92]}>
            <cylinderGeometry args={[0.15, 0.275, 0.3, 12, 1, true]} />
            <meshStandardMaterial
              color={colors.coat}
              roughness={0.86}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
        )}

        {/* thighs */}
        {[-0.075, 0.075].map((k) => (
          <mesh key={`thigh-${k}`} castShadow position={[k, 0.0, -0.21]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[0.062, 0.3, 3, 6]} />
            <meshStandardMaterial color={colors.pants} roughness={0.85} flatShading />
          </mesh>
        ))}

        {/* knees + shins */}
        {[-0.09, 0.09].map((k) => (
          <group key={k} position={[k, 0, -0.4]}>
            <mesh castShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.055, 0.32, 3, 6]} />
              <meshStandardMaterial color={colors.pants} roughness={0.85} flatShading />
            </mesh>
            <mesh position={[0, -0.39, -0.05]} castShadow>
              <boxGeometry args={[0.11, 0.07, 0.2]} />
              <meshStandardMaterial color={colors.shoe || '#1d1b24'} roughness={0.7} />
            </mesh>
          </group>
        ))}

        {/* arms resting on the lap */}
        {[-1, 1].map((a) => (
          <group key={a} position={[a * 0.15, 0.5, -0.02]} rotation={[-0.55, 0, -a * 0.14]}>
            <mesh castShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.043, 0.32, 3, 6]} />
              <meshStandardMaterial color={colors.coat} roughness={0.84} flatShading />
            </mesh>
            <mesh position={[0, -0.39, 0]}>
              <sphereGeometry args={[0.048, 7, 6]} />
              <meshStandardMaterial color={colors.skin} roughness={0.9} />
            </mesh>
          </group>
        ))}

        {/* neck + head */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.08, 6]} />
          <meshStandardMaterial color={colors.skin} roughness={0.9} />
        </mesh>

        <group
          ref={head}
          position={[-side * 0.07, 0.585 + (side > 0 ? -0.03 : 0), 0]}
          rotation={[0.04, 0, side * 0.22]}
        >
          <mesh castShadow>
            <sphereGeometry args={[0.128, 14, 12]} />
            <meshStandardMaterial color={colors.skin} roughness={0.85} flatShading />
          </mesh>

          <group ref={hair}>
            <mesh castShadow position={[0, 0.022, 0.004]}>
              <sphereGeometry args={[0.138, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
              <meshStandardMaterial color={colors.hair} roughness={0.95} flatShading />
            </mesh>
            {isF && (
              <>
                <mesh castShadow position={[0, -0.13, 0.055]}>
                  <capsuleGeometry args={[0.095, 0.2, 3, 8]} />
                  <meshStandardMaterial color={colors.hair} roughness={0.95} flatShading />
                </mesh>
                <mesh castShadow position={[0, -0.04, 0.085]} scale={[1.05, 0.9, 0.9]}>
                  <sphereGeometry args={[0.095, 10, 8]} />
                  <meshStandardMaterial color={colors.hair} roughness={0.95} flatShading />
                </mesh>
              </>
            )}
          </group>

          {/* closed eyes */}
          <group ref={closed}>
            {[-0.048, 0.048].map((x) => (
              <mesh key={x} position={[x, 0.004, -0.121]}>
                <boxGeometry args={[0.056, 0.011, 0.02]} />
                <meshStandardMaterial color="#3a2a2a" roughness={0.9} />
              </mesh>
            ))}
          </group>

          {/* open eyes */}
          <group ref={open} scale={0.001}>
            {[-0.048, 0.048].map((x) => (
              <mesh key={x} position={[x, 0.004, -0.12]}>
                <sphereGeometry args={[0.021, 8, 6]} />
                <meshStandardMaterial color="#2b1f22" roughness={0.5} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * The two characters asleep on the bench — the emotional centre of the site.
 */
export default function SpecialCouple() {
  const stage = useStore((s) => s.stage)
  const settings = useStore((s) => s.content.settings)
  const hover = useStore((s) => s.hoverCouple)
  const setHover = useStore((s) => s.setHoverCouple)
  const enterDream = useStore((s) => s.enterDream)

  const [isHover, setIsHover] = useState(false)
  const group = useRef()
  const glow = useRef()
  const wake = useRef(0)
  const wakeStarted = useRef(null)
  const texture = useMemo(() => makeGlowTexture(), [])

  const interactive = stage === 'explore'
  const waking = stage === 'waking' || stage === 'letter'

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime

    if (waking && wakeStarted.current == null) wakeStarted.current = performance.now()
    if (!waking) wakeStarted.current = null

    const target = waking ? 1 : 0
    if (wakeStarted.current != null && waking) {
      const elapsed = (performance.now() - wakeStarted.current) / 1000
      const p = Math.max(0, Math.min(1, (elapsed - 0.55) / 1.5))
      wake.current += (p - wake.current) * (1 - Math.exp(-dt * 6))
    } else {
      wake.current += (target - wake.current) * (1 - Math.exp(-dt * 3))
    }

    if (group.current) {
      const s = 1 + (isHover ? 0.022 : 0) + Math.sin(t * 1.1) * 0.0015
      group.current.scale.setScalar(s)
    }
    if (glow.current) {
      const base = 0.1 + Math.sin(t * 0.8) * 0.03
      const targetGlow = base + (isHover ? 0.26 : 0) + wake.current * 0.15
      glow.current.material.opacity += (targetGlow - glow.current.material.opacity) * 0.08
    }
  })

  const over = (e) => {
    if (!interactive) return
    e.stopPropagation()
    setIsHover(true)
    setHover(true)
    document.body.style.cursor = 'pointer'
  }
  const out = (e) => {
    e.stopPropagation()
    setIsHover(false)
    setHover(false)
    document.body.style.cursor = ''
  }
  const click = (e) => {
    if (!interactive) return
    e.stopPropagation()
    document.body.style.cursor = ''
    setHover(false)
    setIsHover(false)
    enterDream(0)
  }

  return (
    <group ref={group} position={[BENCH.x, 0, BENCH.z]}>
      <SeatedPerson
        side={-1}
        variant="m"
        wake={wake}
        colors={{
          coat: '#39445c',
          pants: '#242b3c',
          hair: '#241a1c',
          skin: '#e9c6a9',
          shoe: '#1c1a22',
          glow: '#ffb3d1',
        }}
      />
      <SeatedPerson
        side={1}
        variant="f"
        wake={wake}
        colors={{
          coat: '#e3bfcc',
          pants: '#d8b0bf',
          hair: '#3a2521',
          skin: '#f2d5bb',
          shoe: '#2a2028',
          glow: '#ffc9e0',
        }}
      />

      {/* soft halo behind the couple */}
      <sprite ref={glow} position={[0, 1.1, 0.35]} scale={[3.6, 2.6, 1]}>
        <spriteMaterial
          map={texture}
          color="#ffb7d6"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      {/* warm lamp light spilling over the bench */}
      <pointLight position={[1.9, 2.5, 0.6]} color="#ffb877" intensity={7} distance={9} decay={2} />
      <pointLight position={[0, 1.4, -1.2]} color="#ffc9e0" intensity={2.2} distance={5} decay={2} />

      {/* hover / tap target */}
      {/* generous invisible hit area — the couple is small in the wide shot */}
      <mesh
        position={[0, 1.15, -0.1]}
        onPointerOver={over}
        onPointerOut={out}
        onClick={click}
      >
        <boxGeometry args={[3.2, 2.9, 2.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {stage === 'explore' && (
        <Html position={[0, 2.25, 0]} center zIndexRange={[15, 10]} style={{ pointerEvents: 'none' }}>
          <div className={`couple-hint ${isHover ? 'is-hot' : ''}`}>
            <span className="couple-hint__heart">♡</span>
            <span>{settings.dreamHint || 'Click to enter our dream'}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
