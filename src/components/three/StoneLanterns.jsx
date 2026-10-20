import { useMemo } from 'react'
import * as THREE from 'three'
import Instanced from '../common/Instanced'
import { PALETTE } from '../../config/site'
import { makeGlowTexture } from '../../utils/textures'
import { mulberry32, rand } from '../../utils/math'

const SPOTS = [
  [-33, 3.15],
  [-28, -3.15],
  [-21, 3.15],
  [-8, -3.15],
  [3.5, 3.15],
  [13, -3.15],
  [24, 3.15],
  [31, -3.15],
]

/**
 * Small stone lanterns (tōrō) dotted along the road edges — one of the
 * decorative details that gives the park its Japanese character.
 */
export default function StoneLanterns() {
  const glow = useMemo(() => makeGlowTexture(), [])

  const parts = useMemo(() => {
    const rng = mulberry32(63)
    const base = []
    const pillar = []
    const platform = []
    const lightBox = []
    const roof = []
    const finial = []

    SPOTS.forEach(([x, z]) => {
      const yaw = rand(rng, 0, Math.PI * 2)
      const s = rand(rng, 0.92, 1.1)
      base.push({ p: [x, 0, z], r: [0, yaw, 0], s: [s, s, s] })
      pillar.push({ p: [x, 0.12, z], r: [0, yaw, 0], s: [s, s, s] })
      platform.push({ p: [x, 0.78, z], r: [0, yaw, 0], s: [s, s, s] })
      lightBox.push({ p: [x, 0.96, z], r: [0, yaw, 0], s: [s, s, s] })
      roof.push({ p: [x, 1.16, z], r: [0, yaw, 0], s: [s, s, s] })
      finial.push({ p: [x, 1.32, z], r: [0, yaw, 0], s: [s, s, s] })
    })

    return { base, pillar, platform, lightBox, roof, finial }
  }, [])

  const geos = useMemo(
    () => ({
      base: new THREE.CylinderGeometry(0.3, 0.34, 0.12, 6),
      pillar: new THREE.CylinderGeometry(0.11, 0.13, 0.68, 6).translate(0, 0.34, 0),
      platform: new THREE.BoxGeometry(0.46, 0.09, 0.46),
      light: new THREE.BoxGeometry(0.3, 0.32, 0.3),
      roof: new THREE.CylinderGeometry(0.04, 0.38, 0.22, 4),
      finial: new THREE.SphereGeometry(0.075, 8, 6),
    }),
    []
  )

  const stone = '#6b6679'

  return (
    <group>
      <Instanced items={parts.base} geometry={geos.base} castShadow receiveShadow>
        <meshStandardMaterial color={stone} roughness={0.95} flatShading />
      </Instanced>
      <Instanced items={parts.pillar} geometry={geos.pillar} castShadow receiveShadow>
        <meshStandardMaterial color={stone} roughness={0.95} flatShading />
      </Instanced>
      <Instanced items={parts.platform} geometry={geos.platform} castShadow>
        <meshStandardMaterial color={stone} roughness={0.95} flatShading />
      </Instanced>
      <Instanced items={parts.lightBox} geometry={geos.light}>
        <meshStandardMaterial
          color="#5c4433"
          emissive={PALETTE.lampCore}
          emissiveIntensity={2.6}
          roughness={0.6}
        />
      </Instanced>
      <Instanced items={parts.roof} geometry={geos.roof} castShadow>
        <meshStandardMaterial color="#4c4859" roughness={0.9} flatShading />
      </Instanced>
      <Instanced items={parts.finial} geometry={geos.finial}>
        <meshStandardMaterial color="#4c4859" roughness={0.9} flatShading />
      </Instanced>

      {SPOTS.map(([x, z], i) => (
        <sprite key={i} position={[x, 0.96, z]} scale={[1.5, 1.5, 1]}>
          <spriteMaterial
            map={glow}
            color={PALETTE.lampCore}
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}
