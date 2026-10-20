import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import Instanced from '../common/Instanced'
import { PALETTE, QUALITY, WORLD } from '../../config/site'
import { makePathTexture } from '../../utils/textures'
import { mulberry32, rand, pick } from '../../utils/math'

/**
 * The pedestrian road. It runs along the X axis from -36 to +36,
 * with stone curbs, a wet-looking reflective surface and a carpet
 * of fallen petals.
 */
export default function SakuraRoad({ quality = 'high', weather = 'clear' }) {
  const q = QUALITY[quality]
  const pathTex = useMemo(() => makePathTexture(), [])
  const rain = weather === 'rain'

  const fallen = useMemo(() => {
    const rng = mulberry32(2024)
    const items = []
    const count = 760

    for (let i = 0; i < count; i++) {
      // bias density towards the tree rows (z = ±5.1) and the road centre
      const lane = rng()
      let z
      if (lane < 0.55) z = rand(rng, -3.1, 3.1)
      else if (lane < 0.8) z = rand(rng, 3.4, 6.6)
      else z = rand(rng, -6.6, -3.4)

      items.push({
        p: [rand(rng, -35.4, 35.4), 0.055 + rng() * 0.012, z],
        r: [-Math.PI / 2, 0, rng() * Math.PI * 2],
        s: [rand(rng, 0.7, 1.5), rand(rng, 0.7, 1.4), 1],
        c: pick(rng, PALETTE.petals),
      })
    }
    return items
  }, [])

  return (
    <group>
      {/* base shadow plane so the road never z-fights with the grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} receiveShadow>
        <planeGeometry args={[WORLD.road.length + 0.2, WORLD.road.width + 0.2]} />
        <meshStandardMaterial color="#171325" roughness={1} />
      </mesh>

      {/* walking surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <planeGeometry args={[WORLD.road.length, WORLD.road.width]} />
        {q.reflector > 0 ? (
          <MeshReflectorMaterial
            key={`reflector-${quality}`}
            map={pathTex}
            resolution={q.reflector}
            mirror={0.42}
            blur={[420, 200]}
            mixBlur={1.8}
            mixStrength={rain ? 1.1 : 0.5}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.4}
            color="#d6d0e2"
            metalness={rain ? 0.55 : 0.32}
            roughness={rain ? 0.35 : 0.7}
          />
        ) : (
          <meshStandardMaterial
            map={pathTex}
            color="#d6d0e2"
            metalness={0.2}
            roughness={0.8}
          />
        )}
      </mesh>

      {/* curbs on both sides of the road */}
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.10, side * (WORLD.road.width / 2 + 0.16)]} receiveShadow castShadow>
            <boxGeometry args={[WORLD.road.length, 0.2, 0.34]} />
            <meshStandardMaterial color={PALETTE.stone} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.02, side * (WORLD.road.width / 2 + 0.38)]} receiveShadow>
            <boxGeometry args={[WORLD.road.length, 0.08, 0.22]} />
            <meshStandardMaterial color={PALETTE.stoneDark} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* thin inlaid strips running the length of the road */}
      {[1, -1].map((side) => (
        <mesh key={`strip-${side}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, side * 1.62]}>
          <planeGeometry args={[WORLD.road.length, 0.07]} />
          <meshStandardMaterial color="#3d3849" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}

      {/* fallen petals */}
      <Instanced items={fallen} receiveShadow={false}>
        <circleGeometry args={[0.075, 7]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.82}
          metalness={0}
          side={THREE.DoubleSide}
          emissive="#37102a"
          emissiveIntensity={0.35}
        />
      </Instanced>
    </group>
  )
}
