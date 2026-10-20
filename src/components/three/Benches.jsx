import { useMemo } from 'react'
import { PALETTE } from '../../config/site'

function Bench({ position, rotation = 0 }) {
  const wood = '#4a332f'
  const metal = '#1b1b25'

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* legs */}
      {[-0.78, 0.78].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <boxGeometry args={[0.06, 0.44, 0.46]} />
            <meshStandardMaterial color={metal} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.5, 0.24]} rotation={[-0.16, 0, 0]} castShadow>
            <boxGeometry args={[0.06, 0.52, 0.05]} />
            <meshStandardMaterial color={metal} roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* seat slats */}
      {[-0.18, -0.02, 0.14].map((z, i) => (
        <mesh key={`seat-${i}`} position={[0, 0.45, z]} castShadow receiveShadow>
          <boxGeometry args={[1.96, 0.055, 0.14]} />
          <meshStandardMaterial color={wood} roughness={0.82} />
        </mesh>
      ))}

      {/* back slats */}
      {[0.66, 0.82].map((y, i) => (
        <mesh key={`back-${i}`} position={[0, y, 0.27 + (y - 0.66) * 0.18]} rotation={[-0.16, 0, 0]} castShadow>
          <boxGeometry args={[1.96, 0.13, 0.05]} />
          <meshStandardMaterial color={wood} roughness={0.82} />
        </mesh>
      ))}
    </group>
  )
}

/** Wooden benches placed along both sides of the road, facing the sakura. */
export default function Benches() {
  const benches = useMemo(
    () => [
      { p: [-26.5, 0, 3.72], r: 0 },
      { p: [-11.5, 0, -3.72], r: Math.PI },
      { p: [0.6, 0, 4.05], r: 0 },
      { p: [15.5, 0, -3.72], r: Math.PI },
      { p: [27.5, 0, 3.72], r: 0 },
      { p: [-19, 0, -3.72], r: Math.PI },
    ],
    []
  )

  return (
    <group>
      {benches.map((b, i) => (
        <Bench key={i} position={b.p} rotation={b.r} />
      ))}
      {/* a small warm glint under each bench keeps them readable at night */}
      {benches.map((b, i) => (
        <mesh key={`glow-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[b.p[0], 0.06, b.p[2]]}>
          <circleGeometry args={[1.1, 16]} />
          <meshBasicMaterial color={PALETTE.lamp} transparent opacity={0.05} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
