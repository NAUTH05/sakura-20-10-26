import { QUALITY } from '../../config/site'

/**
 * Night lighting: one shadow-casting moon, a cool hemisphere fill and a
 * warm/pink bounce that separates the blossom from the dark skyline.
 * Only a single light casts shadows to keep the frame budget low.
 */
export default function Lighting({ quality = 'high', intensity = 1 }) {
  const q = QUALITY[quality]
  const shadowSize = q.shadows
  const k = Math.max(0.2, Math.min(2, intensity))

  return (
    <>
      <hemisphereLight args={['#7286cc', '#1e1830', 0.72]} />
      <ambientLight intensity={0.09} color="#4a4a86" />

      <directionalLight
        key={`moon-${shadowSize}`}
        position={[-28, 46, 26]}
        intensity={3.8 * k}
        color="#b8c8ff"
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />

      {/* pink rim from the city side */}
      <directionalLight position={[14, 14, -42]} intensity={0.55 * k} color="#ff8ec4" />

      {/* soft glow pooled above the grove */}
      <pointLight position={[0, 12, 2]} intensity={10 * k} distance={38} decay={2} color="#ff9ac9" />
      <pointLight position={[-22, 9, -6]} intensity={9 * k} distance={26} decay={2} color="#9f8bff" />
    </>
  )
}
