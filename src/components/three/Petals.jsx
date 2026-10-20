import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { PALETTE, QUALITY, WORLD } from '../../config/site'
import { mulberry32, rand, pick } from '../../utils/math'

const vert = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWind;
  uniform float uSize;
  uniform float uRangeX;
  uniform float uRangeZ;
  uniform float uHeight;

  attribute vec3 aOffset;
  attribute vec3 aRand;
  attribute vec3 aColor;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  varying float vDepth;

  void main() {
    vUv = uv;
    float t = uTime;

    float fall = 0.55 + aRand.x * 0.95;
    float h = mod(aOffset.z * uHeight + t * fall, uHeight);
    float y = uHeight - h;

    float sway = sin(t * (0.55 + aRand.y * 1.1) + aOffset.z * 23.0);
    float sway2 = cos(t * (0.42 + aRand.z * 0.85) + aOffset.z * 17.0);

    vec3 wp;
    wp.x = aOffset.x + sway * 1.8 + uWind.x * (uHeight - y) * 0.10 + uWind.x * t * 0.55;
    wp.z = aOffset.y + sway2 * 1.35 + uWind.z * (uHeight - y) * 0.10 + uWind.z * t * 0.40;
    wp.x = mod(wp.x + uRangeX, uRangeX * 2.0) - uRangeX;
    wp.z = mod(wp.z + uRangeZ, uRangeZ * 2.0) - uRangeZ;
    wp.y = y + 0.05;

    vec4 mv = viewMatrix * vec4(wp, 1.0);

    float rot = t * (0.9 + aRand.z * 2.8) + aOffset.z * 31.0;
    float s = uSize * (0.6 + aRand.y * 0.85);
    vec2 p = position.xy * s;
    mv.xy += vec2(p.x * cos(rot) - p.y * sin(rot), p.x * sin(rot) + p.y * cos(rot));

    gl_Position = projectionMatrix * mv;

    vDepth = -mv.z;
    vFade = smoothstep(0.0, 1.4, y) * smoothstep(0.0, 2.0, uHeight - y);
    // avoid giant bokeh blobs right in front of the lens
    vFade *= smoothstep(2.2, 9.0, -mv.z);
    vColor = aColor;
  }
`

const frag = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vColor;
  varying float vFade;
  varying float vDepth;

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    // petal silhouette: soft ellipse with a small notch at the tip
    float d = length(uv * vec2(1.0, 0.84));
    float petal = 1.0 - smoothstep(0.66, 1.0, d);
    float notch = smoothstep(0.0, 0.55, length(uv - vec2(0.0, -1.12)));
    petal *= mix(0.2, 1.0, notch);
    if (petal < 0.02) discard;

    vec3 col = vColor * (0.34 + 0.22 * (1.0 - smoothstep(0.1, 0.95, d)));

    float fogF = 1.0 - exp(-pow(vDepth * uFogDensity, 2.0));
    col = mix(col, uFogColor, clamp(fogF, 0.0, 0.9));

    gl_FragColor = vec4(col, petal * vFade * uOpacity);
  }
`

/**
 * Sakura petal particle system.
 *
 * A single instanced quad mesh; all motion (falling, swaying, spinning,
 * wrapping, wind) happens in the vertex shader, so the CPU cost is one
 * uniform update per frame.
 */
export default function Petals({ quality = 'high', intensity = 1 }) {
  const count = Math.max(90, Math.round(QUALITY[quality].petals * Math.max(0, intensity)))
  const matRef = useRef()
  const { rangeX, rangeZ, height } = WORLD.petalField

  const geometry = useMemo(() => {
    const rng = mulberry32(777)
    const base = new THREE.PlaneGeometry(1, 1)

    const g = new THREE.InstancedBufferGeometry()
    g.setIndex(base.index)
    g.setAttribute('position', base.attributes.position)
    g.setAttribute('uv', base.attributes.uv)

    const offsets = new Float32Array(count * 3)
    const rands = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const tmp = new THREE.Color()

    for (let i = 0; i < count; i++) {
      offsets[i * 3] = rand(rng, -rangeX, rangeX)
      offsets[i * 3 + 1] = rand(rng, -rangeZ, rangeZ)
      offsets[i * 3 + 2] = rng()

      rands[i * 3] = rng()
      rands[i * 3 + 1] = rng()
      rands[i * 3 + 2] = rng()

      tmp.set(pick(rng, PALETTE.petals))
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }

    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    g.setAttribute('aRand', new THREE.InstancedBufferAttribute(rands, 3))
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3))
    g.instanceCount = count

    return g
  }, [count, rangeX, rangeZ])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector3(0.35, 0, 0.12) },
      uSize: { value: 0.105 },
      uRangeX: { value: rangeX },
      uRangeZ: { value: rangeZ },
      uHeight: { value: height },
      uOpacity: { value: 0.62 },
      uFogColor: { value: new THREE.Color(PALETTE.fog) },
      uFogDensity: { value: 0.0055 },
    }),
    [rangeX, rangeZ, height]
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = t
    // slow gusts so the fall never looks mechanical
    matRef.current.uniforms.uWind.value.set(
      0.32 + Math.sin(t * 0.11) * 0.22,
      0,
      0.1 + Math.cos(t * 0.07) * 0.16
    )
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        fog={false}
      />
    </mesh>
  )
}
