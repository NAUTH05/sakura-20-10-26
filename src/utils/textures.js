import * as THREE from 'three'
import { mulberry32 } from './math'

/**
 * Every texture in the project is generated at runtime on a canvas.
 * No external image assets are used, which keeps the build tiny and
 * makes the whole scene independent from any reference material.
 */

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

function finish(canvas, { repeat = [1, 1], srgb = true, aniso = 4 } = {}) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.anisotropy = aniso
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** Grass: dark mossy noise with a few lighter blades. */
export function makeGrassTexture() {
  const size = 512
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const rng = mulberry32(21)

  ctx.fillStyle = '#2c4636'
  ctx.fillRect(0, 0, size, size)

  // soft blotches
  for (let i = 0; i < 900; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = 4 + rng() * 26
    const g = 32 + Math.floor(rng() * 26)
    ctx.fillStyle = `rgba(${18 + rng() * 20}, ${g}, ${26 + rng() * 16}, ${0.06 + rng() * 0.12})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // fine blades
  for (let i = 0; i < 5000; i++) {
    const x = rng() * size
    const y = rng() * size
    const len = 2 + rng() * 7
    ctx.strokeStyle = `rgba(${40 + rng() * 40}, ${70 + rng() * 50}, ${50 + rng() * 30}, ${0.10 + rng() * 0.22})`
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rng() - 0.5) * 3, y - len)
    ctx.stroke()
  }

  // faint pink petal dust
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = `rgba(255, ${150 + rng() * 70}, ${190 + rng() * 40}, ${0.05 + rng() * 0.12})`
    ctx.beginPath()
    ctx.arc(rng() * size, rng() * size, 1 + rng() * 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  return finish(c, { repeat: [14, 7] })
}

/** Stone paving for the walking road. */
export function makePathTexture() {
  const size = 512
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const rng = mulberry32(77)

  ctx.fillStyle = '#585165'
  ctx.fillRect(0, 0, size, size)

  // paving grid — 4 x 4 slabs
  const cells = 4
  const step = size / cells
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const shade = 64 + Math.floor(rng() * 20)
      ctx.fillStyle = `rgb(${shade + 6}, ${shade}, ${shade + 16})`
      ctx.fillRect(x * step + 2, y * step + 2, step - 4, step - 4)

      // speckle inside each slab
      for (let i = 0; i < 220; i++) {
        const a = rng() * 0.10
        ctx.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`
        ctx.fillRect(x * step + 3 + rng() * (step - 6), y * step + 3 + rng() * (step - 6), 1.5, 1.5)
      }
    }
  }

  // grout lines
  ctx.strokeStyle = 'rgba(10, 8, 18, 0.75)'
  ctx.lineWidth = 4
  for (let i = 0; i <= cells; i++) {
    ctx.beginPath()
    ctx.moveTo(i * step, 0)
    ctx.lineTo(i * step, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * step)
    ctx.lineTo(size, i * step)
    ctx.stroke()
  }

  // fallen petals on the stones
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255, ${160 + rng() * 60}, ${195 + rng() * 40}, ${0.10 + rng() * 0.30})`
    ctx.beginPath()
    ctx.ellipse(rng() * size, rng() * size, 2 + rng() * 4, 1.2 + rng() * 2.4, rng() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }

  return finish(c, { repeat: [22, 2] })
}

/** Lit window grid for the background skyline. */
export function makeWindowTexture(variant = 0) {
  const w = 256
  const h = 512
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')
  const rng = mulberry32(900 + variant * 37)

  ctx.fillStyle = '#070a14'
  ctx.fillRect(0, 0, w, h)

  const palettes = [
    ['#ffd8a0', '#ffeccb', '#ffbe78', '#fff3d6'],
    ['#b9e6ff', '#8ed3ff', '#e8f8ff', '#cfeeff'],
    ['#ffb6e2', '#c7a8ff', '#9cf2ff', '#ffd9f2'],
  ]
  const pal = palettes[variant % palettes.length]

  const cols = 12
  const rows = 30
  const cw = w / cols
  const ch = h / rows

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const r = rng()
      if (r > 0.38) continue
      const padX = cw * 0.22
      const padY = ch * 0.24
      ctx.globalAlpha = 0.25 + rng() * 0.75
      ctx.fillStyle = pal[Math.floor(rng() * pal.length)]
      ctx.fillRect(x * cw + padX, y * ch + padY, cw - padX * 2, ch - padY * 2)
    }
  }

  // dark floor bands
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(4, 6, 14, 0.55)'
  for (let y = 0; y < rows; y += 3) ctx.fillRect(0, y * ch + ch * 0.9, w, ch * 0.35)

  return finish(c, { repeat: [1, 1] })
}

/** Soft radial glow used for lamp halos, ground pools and the moon. */
export function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 256
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.16)')
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Very subtle vertical gradient used on the road light pools. */
export function makeStreakTexture() {
  const size = 128
  const c = makeCanvas(size, size)
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 210, 160, 0.85)')
  g.addColorStop(0.4, 'rgba(255, 180, 120, 0.22)')
  g.addColorStop(1, 'rgba(255, 160, 100, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
