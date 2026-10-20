import { useMemo } from 'react'
import * as THREE from 'three'
import Instanced from '../common/Instanced'
import { QUALITY } from '../../config/site'
import { mulberry32, rand, pick } from '../../utils/math'

/** Instanced grass tufts — skipped entirely on low quality. */
export default function Grass({ quality = 'high' }) {
  const count = QUALITY[quality].grass

  const items = useMemo(() => {
    if (!count) return []
    const rng = mulberry32(151)
    const list = []

    const bands = [
      { z0: 3.2, z1: 12.2 },
      { z0: -15.8, z1: -3.2 },
    ]

    for (let i = 0; i < count; i++) {
      const band = bands[rng() > 0.5 ? 0 : 1]
      // bias towards the road so the edges look overgrown
      const t = Math.pow(rng(), 0.7)
      const z =
        band.z0 > 0
          ? band.z0 + t * (band.z1 - band.z0)
          : band.z1 - t * (band.z1 - band.z0)

      const x = rand(rng, -35.6, 35.6)
      if (Math.hypot(x - 0.6, z - 4.05) < 2.6) continue
      const s = rand(rng, 0.6, 1.6)
      list.push({
        p: [x, 0, z],
        r: [rand(rng, -0.16, 0.16), rng() * Math.PI * 2, rand(rng, -0.16, 0.16)],
        s: [rand(rng, 0.8, 1.2), s, rand(rng, 0.8, 1.2)],
        c: pick(rng, ['#2c4a38', '#35563f', '#223c2e', '#3d6046']),
      })
    }
    return list
  }, [count])

  const geo = useMemo(
    () => new THREE.ConeGeometry(0.05, 0.55, 3).translate(0, 0.275, 0),
    []
  )

  if (!count) return null

  return (
    <Instanced items={items} geometry={geo} receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
    </Instanced>
  )
}
