import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Figure from './characters/Figure'
import { mulberry32, rand, pick } from '../../utils/math'

const LANES = [-2.1, -1.05, 0, 1.05, 2.1]
const X_LIMIT = 31
const PAUSE_BY_BEHAVIOUR = {
  wander: [1.2, 4.2],
  stroll: [0.4, 1.6],
  lingering: [3.0, 7.0],
}

const OUTFITS = [
  { coat: '#3b4257', pants: '#232838', hair: '#241a1c', skin: '#eccbb0' },
  { coat: '#6d4a5c', pants: '#2b2230', hair: '#2b1c1a', skin: '#f0d2b8' },
  { coat: '#8a6a4f', pants: '#2a2622', hair: '#1e1714', skin: '#e3b895' },
  { coat: '#405a55', pants: '#232c2b', hair: '#241d1a', skin: '#e9c7ac' },
  { coat: '#554a72', pants: '#262436', hair: '#2a1e24', skin: '#f2d4bb' },
  { coat: '#7a5a58', pants: '#2c2426', hair: '#1c1517', skin: '#e6c0a2' },
]

const wrapAngle = (a) => {
  let x = a
  while (x > Math.PI) x -= Math.PI * 2
  while (x < -Math.PI) x += Math.PI * 2
  return x
}

/**
 * Couples strolling along the sakura road.
 *
 * Each couple owns a lane, walks between waypoints on the X axis, pauses to
 * look around, and turns around at the ends. Members of a couple hold hands
 * with their inner arms.
 */
export default function Couples({ count = 4, speed = 1, behavior = 'wander', enabled = true }) {
  const groups = useRef([])

  const data = useMemo(() => {
    const rng = mulberry32(9182)
    const n = Math.max(0, Math.min(5, Math.round(count)))
    const lanes = LANES.slice(0, Math.max(n, 1))

    return Array.from({ length: n }, (_, i) => {
      const dir = i % 2 === 0 ? 1 : -1
      const outfitA = OUTFITS[i % OUTFITS.length]
      const outfitB = OUTFITS[(i + 3) % OUTFITS.length]
      return {
        lane: (lanes[i] ?? 0) + rand(rng, -0.08, 0.08),
        x: rand(rng, -24, 20),
        dir,
        baseSpeed: rand(rng, 0.5, 0.8),
        target: 0,
        pause: rand(rng, 0.3, 2.5),
        rot: dir > 0 ? 0 : Math.PI,
        phase: rng() * Math.PI * 2,
        seed: rng() * 10,
        moving: false,
        outfitA,
        outfitB,
        variantA: 'm',
        variantB: 'f',
        heightA: rand(rng, 1.66, 1.78),
        heightB: rand(rng, 1.5, 1.62),
      }
    })
  }, [count])

  const motions = useRef([])
  if (motions.current.length !== data.length) {
    motions.current = data.map((d) => ({
      a: { current: { phase: d.phase, walking: false, look: 1, seed: d.seed } },
      b: { current: { phase: d.phase + 0.55, walking: false, look: 1, seed: d.seed + 3 } },
    }))
  }

  useFrame((_, delta) => {
    if (!enabled) return
    const dt = Math.min(delta, 0.05)
    const [pMin, pMax] = PAUSE_BY_BEHAVIOUR[behavior] || PAUSE_BY_BEHAVIOUR.wander
    const speedScale = Math.max(0.3, Math.min(2, speed))

    data.forEach((c, i) => {
      const g = groups.current[i]
      if (!g) return
      const pair = motions.current[i]
      const motion = pair.a.current
      const motionB = pair.b.current

      if (c.pause > 0) {
        c.pause -= dt
        c.moving = false
        if (c.pause <= 0) {
          // pick the next waypoint along the current direction
          const ahead = c.x + c.dir * (6 + Math.random() * 13)
          if (ahead > X_LIMIT || ahead < -X_LIMIT) {
            c.dir *= -1
          }
          c.target = Math.max(-X_LIMIT, Math.min(X_LIMIT, c.x + c.dir * (7 + Math.random() * 12)))
        }
      } else {
        const dist = c.target - c.x
        if (Math.abs(dist) < 0.12) {
          c.pause = pMin + Math.random() * (pMax - pMin)
          c.moving = false
        } else {
          const step = Math.min(c.baseSpeed * speedScale * dt, Math.abs(dist))
          c.x += Math.sign(dist) * step
          c.phase += step * 12
          c.moving = true
          // never let a stroller drift into another one in the same lane
          const blocked = data.some(
            (o, j) =>
              j !== i &&
              Math.abs(o.lane - c.lane) < 0.6 &&
              (o.x - c.x) * Math.sign(dist) > 0 &&
              Math.abs(o.x - c.x) < 1.9
          )
          if (blocked) {
            c.x -= Math.sign(dist) * step
            c.phase -= step * 12
            c.moving = false
          }
        }
      }

      const targetRot = c.dir > 0 ? 0 : Math.PI
      const deltaRot = wrapAngle(targetRot - c.rot)
      c.rot += deltaRot * (1 - Math.exp(-dt * 3.2))

      g.position.x = c.x
      g.position.z = c.lane
      g.rotation.y = c.rot

      motion.phase = c.phase
      motion.walking = c.moving
      motion.look = c.moving ? 0.4 : 1
      motionB.phase = c.phase + 0.55
      motionB.walking = c.moving
      motionB.look = motion.look
    })
  })

  if (!enabled || !data.length) return null

  return (
    <group>
      {data.map((c, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el
          }}
          position={[c.x, 0, c.lane]}
        >
          <group position={[0, 0, 0.34]}>
            <Figure
              colors={c.outfitA}
              variant={c.variantA}
              height={c.heightA}
              motion={motions.current[i].a}
              holdSide={-1}
            />
          </group>
          <group position={[0, 0, -0.34]}>
            <Figure
              colors={c.outfitB}
              variant={c.variantB}
              height={c.heightB}
              motion={motions.current[i].b}
              holdSide={1}
            />
          </group>
        </group>
      ))}
    </group>
  )
}
