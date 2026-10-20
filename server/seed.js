import { DEFAULT_SETTINGS, SEED_MEMORIES } from '../shared/defaults.js'
import { uid } from './util.js'

const PALETTES = [
  {
    a: '#3a2140',
    b: '#8c4a63',
    c: '#ffb3c7',
    d: '#ffd9b8',
    label: 'first light',
  },
  {
    a: '#111a3a',
    b: '#3b3f7a',
    c: '#9fb6ff',
    d: '#ff9ecb',
    label: 'rainy night',
  },
  {
    a: '#2a1420',
    b: '#7a3b4a',
    c: '#ffc79a',
    d: '#ff9ecb',
    label: 'october',
  },
]

/**
 * Placeholder "photos" for the seeded memories.
 * Real photos are uploaded from /admin and stored in R2.
 */
export function makePlaceholderSVG(index = 0) {
  const p = PALETTES[index % PALETTES.length]
  const seed = index + 1
  const bokeh = Array.from({ length: 9 }, (_, i) => {
    const x = 90 + ((i * 197 + seed * 71) % 1020)
    const y = 90 + ((i * 311 + seed * 53) % 640)
    const r = 24 + ((i * 37 + seed * 19) % 78)
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? p.c : p.d}" opacity="${
      0.06 + (i % 4) * 0.03
    }" filter="url(#b)"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${p.a}"/>
      <stop offset="55%" stop-color="${p.b}"/>
      <stop offset="100%" stop-color="${p.c}"/>
    </linearGradient>
    <radialGradient id="v" cx="50%" cy="42%" r="72%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <filter id="b" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  ${bokeh}
  <ellipse cx="600" cy="760" rx="620" ry="180" fill="${p.a}" opacity="0.45"/>
  <rect width="1200" height="900" fill="url(#v)"/>
  <g opacity="0.9" font-family="Georgia, 'Times New Roman', serif" fill="#fff">
    <text x="80" y="800" font-size="30" letter-spacing="8" opacity="0.72">${p.label.toUpperCase()}</text>
    <text x="80" y="850" font-size="19" letter-spacing="3" opacity="0.45">our little dream · 0${seed}</text>
  </g>
  <text x="1070" y="120" font-size="46" fill="#fff" opacity="0.5" text-anchor="middle">♡</text>
</svg>`
}

export function makeSeedState() {
  const now = new Date().toISOString()
  const memories = SEED_MEMORIES.map((m, i) => ({
    id: uid(),
    title: m.title,
    body: m.body,
    date: m.date,
    trackId: null,
    visible: true,
    sort: i,
    createdAt: now,
    images: [
      {
        id: uid(),
        key: `seed-${i + 1}.svg`,
        caption: '',
        sort: 0,
      },
    ],
  }))

  return {
    settings: { ...DEFAULT_SETTINGS },
    memories,
    tracks: [
      {
        id: 'ambient',
        title: 'Night ambience (generated)',
        url: 'ambient:',
        key: null,
        isDefault: true,
        sort: 0,
        createdAt: now,
      },
    ],
  }
}

export function seedFiles() {
  return SEED_MEMORIES.map((_, i) => ({
    key: `seed-${i + 1}.svg`,
    body: makePlaceholderSVG(i),
    type: 'image/svg+xml',
  }))
}
