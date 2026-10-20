import { useMemo } from 'react'
import * as THREE from 'three'
import Instanced from '../common/Instanced'
import { PALETTE, WORLD, QUALITY } from '../../config/site'
import { mulberry32, rand, pick } from '../../utils/math'

/**
 * The sakura grove.
 *
 * Two main rows run parallel to the road (one on each side of the Z axis),
 * plus a sparser back row on each side for depth. Every tree is composed of
 * instanced parts: trunk, branches, blossom clusters and a petal drift at
 * the base — so ~36 trees cost only 5 draw calls.
 */
export default function SakuraGrove({ quality = 'high' }) {
  const q = QUALITY[quality]

  const data = useMemo(() => {
    const rng = mulberry32(31)

    const trunks = []
    const branches = []
    const blossoms = []
    const drifts = []

    WORLD.rows.forEach((row) => {
      const step = (WORLD.treeSpreadX * 2) / (row.count - 1)
      for (let i = 0; i < row.count; i++) {
        let x = -WORLD.treeSpreadX + i * step + row.offset + rand(rng, -0.85, 0.85)
        x = Math.max(-33.5, Math.min(33.5, x))
        const z = row.z + rand(rng, -0.6, 0.6)

        const h = rand(rng, 3.2, 4.2) * row.scale
        // one base tone per tree keeps each canopy coherent
        const baseTone = new THREE.Color(pick(rng, PALETTE.petals))
        const tone = (t) => {
          const c = baseTone.clone()
          if (t >= 0) c.lerp(new THREE.Color('#ffe8f2'), Math.min(1, t))
          else c.lerp(new THREE.Color('#b8467a'), Math.min(1, -t))
          return c
        }
        const trunkH = h * rand(rng, 0.56, 0.66)
        const tiltZ = rand(rng, -0.07, 0.07)
        const tiltX = rand(rng, -0.06, 0.06)
        const yaw = rng() * Math.PI * 2

        trunks.push({
          p: [x, 0, z],
          r: [tiltX, yaw, tiltZ],
          s: [1, trunkH, 1],
          c: pick(rng, ['#3a2832', '#443039', '#30212a']),
        })

        // three angled branches reaching into the canopy
        const branchCount = 3
        for (let b = 0; b < branchCount; b++) {
          const a = (b / branchCount) * Math.PI * 2 + rand(rng, -0.5, 0.5)
          const lean = rand(rng, 0.55, 0.95)
          branches.push({
            p: [x, trunkH * rand(rng, 0.72, 0.92), z],
            r: [Math.sin(a) * lean, a, Math.cos(a) * lean],
            s: [1, rand(rng, 1.0, 1.6) * row.scale, 1],
            c: pick(rng, ['#2b1d25', '#33222a']),
          })
        }

        // blossom cloud — a wide umbrella shell built from many small lumps
        const R = h * rand(rng, 0.5, 0.58)
        const cy = trunkH + R * 0.34

        // blobs higher in the canopy catch more light, lower ones sit in shade
        const shadeFor = (py) => {
          const up = Math.min(1, Math.max(0, (py - cy) / (R * 0.85) * 0.5 + 0.5))
          return -0.18 + up * 0.62 + rand(rng, 0, 0.04)
        }

        // inner mass so the silhouette never shows holes
        blossoms.push({
          p: [x, cy, z],
          s: [R * 0.86, R * 0.5, R * 0.86],
          r: [rng() * 0.4, rng() * Math.PI, rng() * 0.4],
          c: tone(shadeFor(cy)),
        })

        // Fibonacci shell — even coverage, organic silhouette
        const blobs = 22
        const golden = Math.PI * (3 - Math.sqrt(5))
        for (let b = 0; b < blobs; b++) {
          const i = b + 0.5
          const sy = 1 - (2 * i) / blobs
          const rad = Math.sqrt(Math.max(0, 1 - sy * sy))
          const theta = golden * i + rng() * 0.4

          const shell = 0.6 + rng() * 0.34
          const r = R * (0.26 + rng() * 0.16)
          const px = x + Math.cos(theta) * rad * R * shell * 1.06
          const py = cy + sy * R * shell * 0.66 + rng() * 0.08
          const pz = z + Math.sin(theta) * rad * R * shell * 1.06

          blossoms.push({
            p: [px, py, pz],
            s: [r, r * rand(rng, 0.66, 0.86), r],
            r: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
            c: tone(shadeFor(py)),
          })
        }

        // petal drift at the foot of the tree
        const driftR = R * rand(rng, 0.55, 0.8)
        drifts.push({
          p: [x, 0.02, z],
          s: [driftR, 0.1 + rng() * 0.06, driftR * rand(rng, 0.8, 1.1)],
          r: [0, rng() * Math.PI, 0],
          c: pick(rng, ['#ffc4dc', '#ffb2d0', '#f6a7c6']),
        })
        drifts.push({
          p: [x + rand(rng, -1.2, 1.2), 0.015, z + rand(rng, -1.2, 1.2)],
          s: [driftR * 0.45, 0.05, driftR * 0.4],
          r: [0, rng() * Math.PI, 0],
          c: pick(rng, ['#ffd0e4', '#ffbcd8']),
        })
      }
    })

    return { trunks, branches, blossoms, drifts }
  }, [])

  const canopyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.86,
        metalness: 0,
        flatShading: true,
        emissive: new THREE.Color(PALETTE.petalGlow),
        emissiveIntensity: 0.05,
      }),
    []
  )

  // geometries are translated so their pivot sits at the base
  const trunkGeo = useMemo(
    () => new THREE.CylinderGeometry(0.17, 0.34, 1, 7).translate(0, 0.5, 0),
    []
  )
  const branchGeo = useMemo(
    () => new THREE.CylinderGeometry(0.04, 0.095, 1, 5).translate(0, 0.5, 0),
    []
  )
  const canopyGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 2)
    const pos = g.attributes.position
    const v = new THREE.Vector3()
    const rng = mulberry32(17)
    const cache = new Map()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const key = `${v.x.toFixed(3)}|${v.y.toFixed(3)}|${v.z.toFixed(3)}`
      let f = cache.get(key)
      if (f === undefined) {
        f = 0.87 + rng() * 0.26
        cache.set(key, f)
      }
      v.multiplyScalar(f)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const driftGeo = useMemo(
    () => new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    []
  )

  return (
    <group>
      {/* trunks */}
      <Instanced items={data.trunks} geometry={trunkGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </Instanced>

      {/* branches */}
      <Instanced items={data.branches} geometry={branchGeo} castShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
      </Instanced>

      {/* blossom clusters */}
      <Instanced
        items={data.blossoms}
        geometry={canopyGeo}
        castShadow={q.treeShadows}
        receiveShadow={false}
      >
        <primitive object={canopyMaterial} attach="material" />
      </Instanced>

      {/* fallen petal drifts */}
      <Instanced items={data.drifts} geometry={driftGeo} receiveShadow>
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.95}
          flatShading
          emissive={PALETTE.petalGlow}
          emissiveIntensity={0.16}
        />
      </Instanced>
    </group>
  )
}
