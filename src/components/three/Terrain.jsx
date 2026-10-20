import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { PALETTE, WORLD } from '../../config/site'
import { makeGrassTexture } from '../../utils/textures'

/**
 * The diorama base: a rounded grass slab sitting on stacked soil strata,
 * so the scene reads as a cut-out chunk of a city rather than an endless plane.
 */
export default function Terrain() {
  const { width, depth, centerZ } = WORLD.slab
  const grass = useMemo(() => makeGrassTexture(), [])

  const strata = [
    { w: width - 0.8, d: depth - 0.8, h: 1.25, y: -1.52, color: PALETTE.soil[0] },
    { w: width - 2.4, d: depth - 2.2, h: 1.15, y: -2.72, color: PALETTE.soil[1] },
    { w: width - 4.2, d: depth - 3.8, h: 1.3, y: -3.95, color: PALETTE.soil[2] },
    { w: width - 6.6, d: depth - 5.6, h: 1.15, y: -5.18, color: PALETTE.soil[3] },
  ]

  return (
    <group position={[0, 0, centerZ]}>
      {/* grass surface */}
      <RoundedBox args={[width, 0.9, depth]} radius={0.34} smoothness={3} position={[0, -0.45, 0]} receiveShadow>
        <meshStandardMaterial map={grass} color="#cfe0d2" roughness={0.98} metalness={0} />
      </RoundedBox>

      {/* thin dark rim under the grass for a crisp cut edge */}
      <RoundedBox args={[width - 0.2, 0.16, depth - 0.2]} radius={0.08} smoothness={2} position={[0, -0.94, 0]}>
        <meshStandardMaterial color="#120d16" roughness={1} />
      </RoundedBox>

      {/* soil strata */}
      {strata.map((s, i) => (
        <RoundedBox
          key={i}
          args={[s.w, s.h, s.d]}
          radius={0.16}
          smoothness={2}
          position={[0, s.y, 0]}
        >
          <meshStandardMaterial color={s.color} roughness={1} metalness={0} />
        </RoundedBox>
      ))}

      {/* faint stone chips embedded in the top soil layer */}
      <mesh position={[width / 2 - 2.6, -1.35, depth / 2 - 3.2]}>
        <boxGeometry args={[0.5, 0.22, 0.32]} />
        <meshStandardMaterial color={PALETTE.stoneDark} roughness={0.9} />
      </mesh>
      <mesh position={[-width / 2 + 3.4, -1.6, -depth / 2 + 4.1]} rotation={[0, 0.6, 0.1]}>
        <boxGeometry args={[0.7, 0.26, 0.4]} />
        <meshStandardMaterial color="#2b2533" roughness={0.95} />
      </mesh>
    </group>
  )
}
