import { Suspense, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PALETTE } from '../config/site'
import { useStore } from '../store/useStore'

import Sky from './three/Sky'
import Terrain from './three/Terrain'
import SakuraRoad from './three/SakuraRoad'
import SakuraGrove from './three/SakuraGrove'
import Bushes from './three/Bushes'
import Grass from './three/Grass'
import StreetLamps from './three/StreetLamps'
import Benches from './three/Benches'
import StoneLanterns from './three/StoneLanterns'
import CitySkyline from './three/CitySkyline'
import Petals from './three/Petals'
import Rain from './three/Rain'
import Lighting from './three/Lighting'
import CameraRig from './three/CameraRig'
import Effects from './three/Effects'
import Couples from './three/Couples'
import SpecialCouple from './three/SpecialCouple'

/**
 * Scene graph for Our Little Dream.
 *
 * The sakura road runs along +X; couples stroll along it; the two main
 * characters sleep on the bench at x = 2.5; the city is a backdrop on -Z.
 * Everything visual that the admin can tune is read from settings.
 */
export default function Experience() {
  const quality = useStore((s) => s.quality)
  const weather = useStore((s) => s.weather)
  const settings = useStore((s) => s.content.settings)
  const scene = useThree((s) => s.scene)

  // dev-only scene handle (stripped from production builds)
  useEffect(() => {
    if (import.meta.env?.DEV) window.__scene = scene
  }, [scene])

  const rain = weather === 'rain'
  const fog = settings.fog !== false

  return (
    <Suspense fallback={null}>
      <color attach="background" args={[PALETTE.night]} />
      {fog ? (
        <fogExp2 attach="fog" args={[PALETTE.fog, 0.0072]} />
      ) : (
        <fogExp2 attach="fog" args={[PALETTE.fog, 0.0006]} />
      )}

      <Sky />
      <Lighting quality={quality} intensity={settings.lightIntensity ?? 1} />

      <Terrain />
      <SakuraRoad quality={quality} weather={weather} />
      <SakuraGrove quality={quality} />
      <Bushes />
      <Grass quality={quality} />
      <StreetLamps quality={quality} />
      <Benches />
      <StoneLanterns />
      <CitySkyline quality={quality} />

      <Couples
        count={settings.npcEnabled === false ? 0 : settings.npcCouples ?? 4}
        speed={settings.npcSpeed ?? 1}
        behavior={settings.npcBehavior ?? 'wander'}
        enabled={settings.npcEnabled !== false}
      />
      <SpecialCouple />

      <Petals quality={quality} intensity={settings.petalIntensity ?? 1} />
      <Rain quality={quality} active={rain} />

      <CameraRig />
      <Effects quality={quality} bloom={settings.bloom !== false} />
    </Suspense>
  )
}
