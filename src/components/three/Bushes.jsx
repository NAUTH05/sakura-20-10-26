import { useMemo } from 'react'
import * as THREE from 'three'
import Instanced from '../common/Instanced'
import { mulberry32, rand, pick } from '../../utils/math'

/** Low-poly shrubs filling the grass bands between the trees and the curbs. */
export default function Bushes() {
  const data = useMemo(() => {
    const rng = mulberry32(404)
    const bushes = []
    const flowers = []

    const bands = [
      { z0: 3.55, z1: 11.6 },
      { z0: -15.2, z1: -3.55 },
    ]

    for (let i = 0; i < 84; i++) {
      const band = bands[rng() > 0.5 ? 0 : 1]
      const x = rand(rng, -35, 35)
      const z = rand(rng, band.z0, band.z1)
      // leave a clear pocket around the bench where the main couple sits
      if (Math.hypot(x - 0.6, z - 4.05) < 3.4) continue
      const s = rand(rng, 0.55, 1.35)

      bushes.push({
        p: [x, s * 0.42, z],
        r: [rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3],
        s: [s * rand(rng, 1.1, 1.5), s * 0.8, s * rand(rng, 1.1, 1.5)],
        c: pick(rng, ['#1e3a2e', '#254436', '#1a3128', '#2c4a3a']),
      })

      // a few bushes are in bloom
      if (rng() > 0.68) {
        const n = 2 + Math.floor(rng() * 3)
        for (let k = 0; k < n; k++) {
          flowers.push({
            p: [x + rand(rng, -0.4, 0.4) * s, s * rand(rng, 0.6, 0.9), z + rand(rng, -0.4, 0.4) * s],
            s: rand(rng, 0.1, 0.19),
            c: pick(rng, ['#ff9ec4', '#ffb8d4', '#f5a0c8']),
          })
        }
      }
    }

    return { bushes, flowers }
  }, [])

  const bushGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  const flowerGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])

  return (
    <group>
      <Instanced items={data.bushes} geometry={bushGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </Instanced>
      <Instanced items={data.flowers} geometry={flowerGeo}>
        <meshStandardMaterial color="#ffffff" roughness={0.8} flatShading />
      </Instanced>
    </group>
  )
}
