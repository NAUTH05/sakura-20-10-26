/** Small deterministic helpers so the scene looks identical on every reload. */

export function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rand = (rng, min, max) => min + rng() * (max - min)
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length]
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const easeInOut = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt))
