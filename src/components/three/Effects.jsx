import { EffectComposer, Bloom, Vignette, Noise, SMAA } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { QUALITY } from '../../config/site'

/**
 * Cinematic post stack: HDR bloom for the lanterns and neon, ACES tone
 * mapping, a soft vignette and a whisper of grain.
 */
export default function Effects({ quality = 'high', bloom = true }) {
  const q = QUALITY[quality]

  return (
    <EffectComposer key={`fx-${quality}`} multisampling={0} enableNormalPass={false}>
      {bloom && (
        <Bloom
          mipmapBlur
          intensity={q.bloom * 0.85}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.28}
          radius={0.78}
        />
      )}
      <Vignette offset={0.24} darkness={0.72} eskil={false} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      {q.smaa ? <SMAA /> : <></>}
    </EffectComposer>
  )
}
