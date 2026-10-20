import { useMemo } from 'react'
import * as THREE from 'three'
import Instanced from '../common/Instanced'
import { PALETTE } from '../../config/site'
import { makeGlowTexture } from '../../utils/textures'
import { mulberry32 } from '../../utils/math'

const LAMP_X = [-30, -18, -6, 6, 18, 30]
const LAMP_Z = 3.35

/**
 * Warm park lanterns along both curbs. The visible light is mostly faked with
 * emissive lantern heads, additive halos and ground pools; only three real
 * point lights are used to keep the shading cheap.
 */
export default function StreetLamps({ quality = 'high' }) {
  const glow = useMemo(() => makeGlowTexture(), [])

  const positions = useMemo(() => {
    const rng = mulberry32(5)
    const list = []
    LAMP_X.forEach((x, i) => {
      ;[1, -1].forEach((side) => {
        list.push({
          x: x + (rng() - 0.5) * 0.3,
          z: side * LAMP_Z,
          side,
          key: `${i}-${side}`,
        })
      })
    })
    return list
  }, [])

  const bases = useMemo(
    () => positions.map((p) => ({ p: [p.x, 0.0, p.z], s: [1, 1, 1] })),
    [positions]
  )
  const poles = useMemo(
    () => positions.map((p) => ({ p: [p.x, 0.14, p.z], s: [1, 3.05, 1] })),
    [positions]
  )
  const heads = useMemo(
    () => positions.map((p) => ({ p: [p.x, 3.28, p.z], r: [0, Math.PI / 4, 0], s: [1, 1, 1] })),
    [positions]
  )
  const caps = useMemo(
    () => positions.map((p) => ({ p: [p.x, 3.5, p.z], r: [0, Math.PI / 4, 0], s: [1, 1, 1] })),
    [positions]
  )
  const pools = useMemo(
    () =>
      positions.map((p) => ({
        p: [p.x, 0.062, p.z - p.side * 0.35],
        r: [-Math.PI / 2, 0, 0],
        s: [6.6, 4.6, 1],
      })),
    [positions]
  )

  const baseGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.22, 0.14, 8), [])
  const poleGeo = useMemo(
    () => new THREE.CylinderGeometry(0.055, 0.08, 1, 8).translate(0, 0.5, 0),
    []
  )
  const headGeo = useMemo(() => new THREE.CylinderGeometry(0.23, 0.16, 0.36, 4), [])
  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.02, 0.3, 0.16, 4), [])

  return (
    <group>
      <Instanced items={bases} geometry={baseGeo} castShadow>
        <meshStandardMaterial color={PALETTE.metal} roughness={0.6} metalness={0.5} />
      </Instanced>

      <Instanced items={poles} geometry={poleGeo} castShadow>
        <meshStandardMaterial color="#171720" roughness={0.55} metalness={0.6} />
      </Instanced>

      <Instanced items={heads} geometry={headGeo}>
        <meshStandardMaterial
          color="#4a3325"
          emissive={PALETTE.lamp}
          emissiveIntensity={2.5}
          roughness={0.4}
          metalness={0.1}
        />
      </Instanced>

      <Instanced items={caps} geometry={capGeo} castShadow>
        <meshStandardMaterial color="#14141c" roughness={0.5} metalness={0.6} />
      </Instanced>

      {/* warm pools on the paving */}
      <Instanced items={pools}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glow}
          color="#ff9a4a"
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </Instanced>

      {/* halos around each lantern */}
      {positions.map((p) => (
        <sprite key={`halo-${p.key}`} position={[p.x, 3.28, p.z]} scale={[2.4, 2.4, 1]}>
          <spriteMaterial
            map={glow}
            color={PALETTE.lamp}
            transparent
            opacity={0.72}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}

      {/* only a few real lights, no shadows */}
      {quality !== 'low' && (
        <>
          <pointLight position={[-24, 3.3, 0]} color={PALETTE.lamp} intensity={34} distance={26} decay={2} />
          <pointLight position={[-8, 3.3, 0]} color={PALETTE.lamp} intensity={34} distance={26} decay={2} />
          <pointLight position={[8, 3.3, 0]} color={PALETTE.lamp} intensity={34} distance={26} decay={2} />
          <pointLight position={[24, 3.3, 0]} color={PALETTE.lamp} intensity={34} distance={26} decay={2} />
        </>
      )}
      {quality === 'low' && (
        <pointLight position={[0, 3.3, 0]} color={PALETTE.lamp} intensity={18} distance={26} decay={2} />
      )}
    </group>
  )
}
