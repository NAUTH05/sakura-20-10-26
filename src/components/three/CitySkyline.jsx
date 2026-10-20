import { useMemo } from 'react'
import * as THREE from 'three'
import Instanced from '../common/Instanced'
import { PALETTE, QUALITY, WORLD } from '../../config/site'
import { makeWindowTexture, makeGlowTexture } from '../../utils/textures'
import { mulberry32, rand, pick } from '../../utils/math'

/**
 * Background skyline. Purely decorative: simple boxes with a procedural
 * window texture, neon signage and rooftop beacons. It sits behind the park
 * on the -Z side and never interacts with the camera.
 */

function makeFacadeGeometry(uvW, uvH) {
  const g = new THREE.BoxGeometry(1, 1, 1)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * uvW, uv.getY(i) * uvH)
  }
  return g
}

export default function CitySkyline({ quality = 'high' }) {
  const q = QUALITY[quality]

  const { buckets, roofs, penthouses, signs, beacons, far, glowTex } = useMemo(() => {
    const rng = mulberry32(1969)
    const count = q.cityCount

    const buildings = []

    // Layer 1 — a dense low street edge hugging the back of the park.
    // Its bases are hidden by the park itself, so the city never floats.
    const nearCount = 20
    for (let i = 0; i < nearCount; i++) {
      const t = i / (nearCount - 1)
      const x = -88 + t * 176 + rand(rng, -1.6, 1.6)
      const z = rand(rng, -21.5, -30)
      const w = rand(rng, 6, 11)
      const d = rand(rng, 5, 9)
      const h = rand(rng, 3, 5.5)
      buildings.push({ x, z, w, d, h, near: true, v: Math.floor(rng() * 3) })
    }

    // Layer 2 — mid-rise blocks
    const midCount = Math.round(count * 0.36)
    for (let i = 0; i < midCount; i++) {
      const t = midCount === 1 ? 0.5 : i / (midCount - 1)
      const x = -96 + t * 192 + rand(rng, -5, 5)
      const z = rand(rng, -34, -48)
      buildings.push({
        x,
        z,
        w: rand(rng, 5, 10),
        d: rand(rng, 5, 10),
        h: rand(rng, 5, 7.5) + rng() * 2,
        near: false,
        v: Math.floor(rng() * 3),
      })
    }

    // Layer 3 — towers fading into the haze
    const towerCount = Math.round(count * 0.62)
    for (let i = 0; i < towerCount; i++) {
      const t = towerCount === 1 ? 0.5 : i / (towerCount - 1)
      const x = -100 + t * 200 + rand(rng, -6, 6)
      const z = rand(rng, -52, -74)
      buildings.push({
        x,
        z,
        w: rand(rng, 5, 10),
        d: rand(rng, 5, 10),
        h: rand(rng, 7, 9.5) + Math.pow(rng(), 1.5) * 2.5,
        near: false,
        v: Math.floor(rng() * 3),
      })
    }

    // group by height band AND window palette so every block looks different
    const groupMap = new Map()
    buildings.forEach((b) => {
      const band = b.near ? 3 : b.h < 7 ? 0 : b.h < 10 ? 1 : 2
      const key = `${band}-${b.v}`
      if (!groupMap.has(key)) groupMap.set(key, { band, variant: b.v, list: [] })
      groupMap.get(key).list.push(b)
    })
    const groups = [...groupMap.values()].map((g) => g.list)
    const variants = [...groupMap.values()].map((g) => g.variant)

    const avg = (arr, key) =>
      arr.length ? arr.reduce((s, b) => s + b[key], 0) / arr.length : 1

    const buckets = groups.map((list, i) => {
      const aw = avg(list, 'w')
      const ah = avg(list, 'h')
      const uvW = (aw / 1.35) / 12
      const uvH = (ah / 3.0) / 30
      return {
        variant: variants[i],
        geometry: makeFacadeGeometry(uvW, uvH),
        items: list.map((b) => ({
          p: [b.x, b.h / 2, b.z],
          s: [b.w, b.h, b.d],
        })),
      }
    })

    const roofs = buildings.map((b) => ({
      p: [b.x, b.h + 0.22, b.z],
      s: [b.w + 0.5, 0.44, b.d + 0.5],
    }))

    const penthouses = buildings
      .filter((b) => !b.near && rng() > 0.55)
      .map((b) => {
        const pw = b.w * rand(rng, 0.35, 0.55)
        const pd = b.d * rand(rng, 0.35, 0.55)
        return {
          p: [b.x + rand(rng, -0.6, 0.6), b.h + 1.4, b.z + rand(rng, -0.6, 0.6)],
          s: [pw, 2.4, pd],
        }
      })

    const signs = []
    buildings.forEach((b) => {
      if (b.near) return
      if (rng() > 0.55) {
        const color = new THREE.Color(pick(rng, PALETTE.neon)).multiplyScalar(3.0)
        const vertical = rng() > 0.45
        const zFront = b.z + b.d / 2 + 0.16
        if (vertical) {
          const hh = b.h * rand(rng, 0.2, 0.36)
          signs.push({
            p: [b.x + rand(rng, -b.w * 0.3, b.w * 0.3), b.h * rand(rng, 0.42, 0.62), zFront],
            s: [rand(rng, 0.35, 0.6), hh, 0.14],
            c: color,
          })
        } else {
          signs.push({
            p: [b.x, b.h * rand(rng, 0.62, 0.82), zFront],
            s: [b.w * rand(rng, 0.45, 0.75), rand(rng, 0.4, 0.7), 0.14],
            c: color,
          })
        }
      }
      // secondary sign on a side face for the taller towers
      if (b.h > 22 && rng() > 0.5) {
        signs.push({
          p: [b.x + b.w / 2 + 0.16, b.h * 0.5, b.z],
          s: [0.14, b.h * rand(rng, 0.16, 0.28), rand(rng, 0.4, 0.7)],
          c: new THREE.Color(pick(rng, PALETTE.neon)).multiplyScalar(2.1),
        })
      }
    })

    const beacons = buildings
      .filter((b) => !b.near && b.h > 11)
      .map((b) => ({
        p: [b.x, b.h + 0.9, b.z],
        s: 0.34,
        c: pick(rng, ['#ff5f8f', '#ff8a6b', '#ff4f6d']),
      }))

    const far = []
    for (let i = 0; i < 44; i++) {
      const x = rand(rng, -95, 95)
      const z = rand(rng, -140, -220)
      const w = rand(rng, 6, 14)
      const h = rand(rng, 16, 52)
      far.push({ p: [x, h / 2, z], s: [w, h, rand(rng, 6, 12)] })
    }

    return { buckets, roofs, penthouses, signs, beacons, far, glowTex: makeGlowTexture() }
  }, [q.cityCount])

  const windowTextures = useMemo(
    () => [0, 1, 2].map((i) => makeWindowTexture(i)),
    []
  )

  return (
    <group>
      {/* city ground plate — grounds the skyline and hides the building bases */}
      <mesh position={[0, -0.83, -246]} receiveShadow>
        <boxGeometry args={[520, 1.6, 520]} />
        <meshStandardMaterial color="#0b1120" roughness={1} metalness={0} />
      </mesh>

      {/* lit facades */}
      {buckets.map((b, i) => (
        <Instanced key={`facade-${i}`} items={b.items} geometry={b.geometry}>
          <meshStandardMaterial
            emissiveMap={windowTextures[b.variant]}
            emissive="#ffffff"
            emissiveIntensity={1.5}
            color="#232a44"
            roughness={0.9}
            metalness={0.05}
          />
        </Instanced>
      ))}

      {/* roof caps hide the stretched top face of the window texture */}
      <Instanced items={roofs}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0a0d18" roughness={0.9} />
      </Instanced>

      <Instanced items={penthouses}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0d1120" roughness={0.85} metalness={0.2} />
      </Instanced>

      {/* neon signage */}
      <Instanced items={signs}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </Instanced>

      {/* rooftop beacons */}
      <Instanced items={beacons}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </Instanced>

      {/* distant silhouettes for depth */}
      <Instanced items={far}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1a2544" roughness={1} />
      </Instanced>

      {/* atmospheric light pollution behind the towers */}
      <sprite position={[-30, 6, -96]} scale={[230, 62, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#4b3a80"
          transparent
          opacity={0.13}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </sprite>
      <sprite position={[40, 5, -92]} scale={[180, 52, 1]}>
        <spriteMaterial
          map={glowTex}
          color="#8a3f63"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </sprite>
    </group>
  )
}
