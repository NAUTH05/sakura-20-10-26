/**
 * Central scene configuration.
 * All world dimensions are expressed in metres; the park is a diorama slab
 * centred on the origin, with the sakura road running along the X axis.
 */

export const PALETTE = {
  night: '#05070f',
  fog: '#1e2748',
  skyTop: '#03050f',
  skyMid: '#0b1230',
  skyHorizon: '#1b2145',
  skyGlow: '#4b2a63',

  grass: '#2c4536',
  grassDark: '#182a23',
  soil: ['#3a2c3a', '#2f2331', '#241a26', '#1a121d'],
  stone: '#6a6578',
  stoneDark: '#403c4c',
  wood: '#3a2a2c',
  metal: '#191922',

  petals: ['#ff9ec4', '#ff8ab6', '#ffb6d2', '#f78bb5', '#ffc9dd', '#f27ba9', '#ffe0ee'],
  petalGlow: '#ff7fb6',
  lamp: '#ffb168',
  lampCore: '#ffd9a8',
  neon: ['#5ce8ff', '#a98cff', '#ff6fc0', '#7dffe1', '#ffa46b'],
}

export const WORLD = {
  /** Park slab */
  slab: { width: 76, depth: 30, centerZ: -2, thickness: 0.9 },
  /** Pedestrian road: along X */
  road: { length: 72, width: 5.6 },
  /** Sakura rows: two parallel rows, one each side of the road (Z) */
  rows: [
    { z: 6.1, count: 8, offset: 0.0, scale: 1.0 },
    { z: -6.1, count: 8, offset: 4.2, scale: 1.0 },
    { z: -10.6, count: 6, offset: 2.1, scale: 0.86 },
  ],
  treeSpreadX: 32,
  /** Petal volume */
  petalField: { rangeX: 35, rangeZ: 13, height: 9 },
  /** City block sits behind the park, on the -Z side */
  city: { frontZ: -30, backZ: -66 },
}

export const CAMERA = {
  overview: {
    dir: [0.18, 0.60, 1.0],
    // portrait screens look down more steeply so the park fills the tall frame
    dirMobile: [0.18, 0.72, 0.85],
    target: [0, 0.8, -7],
    targetMobile: [0, 3.4, -7],
    fov: 30,
    fovMobile: 42,
    fitWidth: 84,
    fitWidthMobile: 32,
  },
  road: {
    position: [-31, 2.15, 1.15],
    target: [16, 1.9, -0.35],
    fov: 58,
    fovMobile: 66,
  },
  cinematic: {
    fov: 56,
    travel: 30,
    returnTime: 4,
    fromX: -31,
    toX: 31,
    height: 1.78,
  },
  /** close-up on the sleeping couple */
  dream: {
    position: [2.3, 1.48, 0.55],
    target: [0.6, 0.95, 3.95],
    fov: 36,
    positionMobile: [3.5, 1.7, -1.2],
    targetMobile: [0.6, 1.0, 3.95],
    fovMobile: 46,
  },
  /** slightly tighter view used while they wake up */
  wake: {
    position: [2.0, 1.4, 1.0],
    target: [0.6, 1.0, 3.97],
    fov: 38,
    positionMobile: [3.2, 1.62, -0.7],
    targetMobile: [0.6, 1.02, 3.97],
    fovMobile: 46,
  },
  /** scripted welcome fly-through */
  intro: {
    road: { position: [-7, 2.7, 1.1], target: [20, 2.3, -0.6], fov: 55 },
    roadMobile: { position: [-6, 3.0, 0.6], target: [20, 2.4, -0.4], fov: 64 },
    firstLeg: 4.6,
    secondLeg: 3.4,
  },
  limits: { minDistance: 6, maxDistance: 200 },
}

/** Quality presets — keeps the scene comfortable on mobile. */
export const QUALITY = {
  high: {
    dpr: [1, 1.75],
    shadows: 2048,
    petals: 2000,
    grass: 900,
    rain: 1700,
    reflector: 512,
    bloom: 1.05,
    smaa: true,
    treeShadows: true,
    cityCount: 26,
  },
  medium: {
    dpr: [1, 1.35],
    shadows: 1024,
    petals: 1100,
    grass: 460,
    rain: 900,
    reflector: 256,
    bloom: 0.95,
    smaa: true,
    treeShadows: true,
    cityCount: 20,
  },
  low: {
    dpr: [0.85, 1.0],
    shadows: 512,
    petals: 450,
    grass: 0,
    rain: 400,
    reflector: 0,
    bloom: 0.8,
    smaa: false,
    treeShadows: false,
    cityCount: 18,
  },
}
