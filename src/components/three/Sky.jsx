import { useMemo } from 'react'
import * as THREE from 'three'
import { PALETTE } from '../../config/site'
import { makeGlowTexture } from '../../utils/textures'
import { mulberry32 } from '../../utils/math'

const skyVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFrag = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uVoid;
  varying vec3 vWorld;

  void main() {
    vec3 d = normalize(vWorld);
    float hy = d.y;
    float h = clamp(hy, 0.0, 1.0);

    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.30, h));
    col = mix(col, uTop, smoothstep(0.22, 0.9, h));

    // city light pollution blooming above the skyline (-Z side)
    float band = exp(-pow(h * 7.5, 1.5));
    float side = smoothstep(-0.4, 1.0, -d.z * 0.5 + 0.5);
    col += uGlow * band * (0.25 + 0.75 * side);

    // below the horizon the diorama floats in darkness, not in purple haze
    col = mix(uVoid, col, smoothstep(-0.10, 0.015, hy));

    // gentle vertical dithering to avoid banding on dark gradients
    float dither = fract(sin(dot(d.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    col += dither * 0.006;

    gl_FragColor = vec4(col, 1.0);
  }
`

export default function Sky() {
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
      uGlow: { value: new THREE.Color(PALETTE.skyGlow).multiplyScalar(0.34) },
      uVoid: { value: new THREE.Color('#0a1020') },
    }),
    []
  )

  const stars = useMemo(() => {
    const rng = mulberry32(4242)
    const count = 1100
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // upper dome only, biased away from the horizon
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(0.06 + rng() * 0.94)
      const r = 400
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 + 8
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const glow = useMemo(() => makeGlowTexture(), [])

  return (
    <group>
      <mesh scale={[1, 1, 1]} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[430, 32, 24]} />
        <shaderMaterial
          vertexShader={skyVert}
          fragmentShader={skyFrag}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      <points geometry={stars} frustumCulled={false}>
        <pointsMaterial
          color="#cfd9ff"
          size={1.15}
          sizeAttenuation={false}
          transparent
          opacity={0.6}
          depthWrite={false}
          fog={false}
        />
      </points>

      {/* moon + halo, sitting low behind the skyline */}
      <sprite position={[-92, 104, -250]} scale={[46, 46, 1]}>
        <spriteMaterial
          map={glow}
          color="#8fb4ff"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </sprite>
      <sprite position={[-92, 104, -249]} scale={[11, 11, 1]}>
        <spriteMaterial
          map={glow}
          color="#e8f0ff"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </sprite>
    </group>
  )
}
