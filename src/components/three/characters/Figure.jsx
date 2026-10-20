import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Low-poly park stroller.
 *
 * Local forward is +X. The parent group rotates the whole couple when it
 * turns around, so limbs only ever swing around Z.
 */
export default function Figure({
  colors = {},
  variant = 'm',
  height = 1.68,
  motion,
  holdSide = 0,
  castShadow = true,
}) {
  const body = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const head = useRef()
  const hair = useRef()

  const coat = colors.coat || '#3b4257'
  const pants = colors.pants || '#262b3b'
  const skin = colors.skin || '#e9c7ac'
  const hairColor = colors.hair || '#2a1d1e'

  useFrame((state, delta) => {
    const m = motion?.current
    if (!m) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const k = 1 - Math.exp(-dt * 10)

    if (m.walking) {
      const swing = Math.sin(m.phase) * 0.55
      legL.current.rotation.z += (swing - legL.current.rotation.z) * k
      legR.current.rotation.z += (-swing - legR.current.rotation.z) * k
      if (armL.current && holdSide !== 1) {
        armL.current.rotation.z += (-swing * 0.7 - armL.current.rotation.z) * k
      }
      if (armR.current && holdSide !== -1) {
        armR.current.rotation.z += (swing * 0.7 - armR.current.rotation.z) * k
      }
      body.current.position.y = Math.abs(Math.cos(m.phase)) * 0.035
      body.current.rotation.z += (0.035 - body.current.rotation.z) * k
      head.current.rotation.y += (0 - head.current.rotation.y) * k
      head.current.rotation.z += (0 - head.current.rotation.z) * k
    } else {
      legL.current.rotation.z += (0 - legL.current.rotation.z) * k
      legR.current.rotation.z += (0 - legR.current.rotation.z) * k
      if (armL.current && holdSide !== 1) {
        armL.current.rotation.z += (0 - armL.current.rotation.z) * k
      }
      if (armR.current && holdSide !== -1) {
        armR.current.rotation.z += (0 - armR.current.rotation.z) * k
      }
      body.current.position.y += (Math.sin(t * 1.1 + (m.seed || 0)) * 0.008 - body.current.position.y) * k
      body.current.rotation.z += (0 - body.current.rotation.z) * k
      const look = Math.sin(t * 0.45 + (m.seed || 0)) * 0.55 * (m.look ?? 1)
      head.current.rotation.y += (look - head.current.rotation.y) * k * 0.6
      head.current.rotation.z += (Math.sin(t * 0.8 + (m.seed || 0)) * 0.03 - head.current.rotation.z) * k
    }

    if (hair.current) {
      hair.current.rotation.z = Math.sin(t * 1.3 + (m.seed || 0)) * 0.02
    }
  })

  const scale = height / 1.68
  const isF = variant === 'f'

  return (
    <group scale={scale}>
      <group ref={body}>
        {/* legs */}
        <group ref={legL} position={[0, 0.78, 0.085]}>
          <mesh castShadow position={[0, -0.39, 0]}>
            <capsuleGeometry args={[0.055, 0.66, 3, 6]} />
            <meshStandardMaterial color={pants} roughness={0.85} flatShading />
          </mesh>
        </group>
        <group ref={legR} position={[0, 0.78, -0.085]}>
          <mesh castShadow position={[0, -0.39, 0]}>
            <capsuleGeometry args={[0.055, 0.66, 3, 6]} />
            <meshStandardMaterial color={pants} roughness={0.85} flatShading />
          </mesh>
        </group>

        {/* torso */}
        <mesh castShadow position={[0, 1.08, 0]}>
          <cylinderGeometry args={[isF ? 0.15 : 0.175, isF ? 0.2 : 0.195, 0.62, 8]} />
          <meshStandardMaterial color={coat} roughness={0.82} flatShading />
        </mesh>

        {/* skirt / coat hem */}
        {isF && (
          <mesh castShadow position={[0, 0.76, 0]}>
            <coneGeometry args={[0.27, 0.42, 9, 1, true]} />
            <meshStandardMaterial color={coat} roughness={0.86} side={THREE.DoubleSide} flatShading />
          </mesh>
        )}

        {/* neck */}
        <mesh position={[0, 1.42, 0]}>
          <cylinderGeometry args={[0.055, 0.06, 0.08, 6]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>

        {/* head */}
        <group ref={head} position={[0, 1.5, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.135, 12, 10]} />
            <meshStandardMaterial color={skin} roughness={0.85} flatShading />
          </mesh>
          <group ref={hair}>
            <mesh castShadow position={[-0.01, 0.03, 0]}>
              <sphereGeometry args={[0.143, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              <meshStandardMaterial color={hairColor} roughness={0.95} flatShading />
            </mesh>
            {isF && (
              <mesh castShadow position={[-0.07, -0.14, 0]}>
                <capsuleGeometry args={[0.1, 0.2, 3, 8]} />
                <meshStandardMaterial color={hairColor} roughness={0.95} flatShading />
              </mesh>
            )}
          </group>
        </group>

        {/* arms */}
        <group
          ref={armL}
          position={[0, 1.32, isF ? 0.185 : 0.205]}
          rotation={[holdSide === 1 ? -0.3 : 0, 0, 0]}
        >
          <mesh castShadow position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.045, 0.42, 3, 6]} />
            <meshStandardMaterial color={coat} roughness={0.84} flatShading />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.05, 7, 6]} />
            <meshStandardMaterial color={skin} roughness={0.9} />
          </mesh>
        </group>
        <group
          ref={armR}
          position={[0, 1.32, isF ? -0.185 : -0.205]}
          rotation={[holdSide === -1 ? 0.3 : 0, 0, 0]}
        >
          <mesh castShadow position={[0, -0.26, 0]}>
            <capsuleGeometry args={[0.045, 0.42, 3, 6]} />
            <meshStandardMaterial color={coat} roughness={0.84} flatShading />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.05, 7, 6]} />
            <meshStandardMaterial color={skin} roughness={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
