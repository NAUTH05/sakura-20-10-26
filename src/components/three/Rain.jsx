import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { QUALITY } from '../../config/site'
import { mulberry32, rand } from '../../utils/math'

const vert = /* glsl */ `
  uniform float uTime;
  uniform vec3 uWind;
  uniform float uHeight;
  uniform float uLength;
  uniform float uWidth;

  attribute vec3 aOffset;
  attribute vec2 aRand;

  varying vec2 vUv;
  varying float vFade;

  void main() {
    vUv = uv;

    float fall = 17.0 + aRand.x * 11.0;
    float h = mod(aOffset.z * uHeight + uTime * fall, uHeight);
    float y = uHeight - h;

    vec3 wp = vec3(aOffset.x, y, aOffset.y);
    wp.x += uWind.x * (uHeight - y) * 0.07;
    wp.z += uWind.z * (uHeight - y) * 0.07;

    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vec2 p = position.xy;
    p.x *= uWidth;
    p.y *= uLength * (0.65 + aRand.y * 0.7);
    mv.xy += p;

    gl_Position = projectionMatrix * mv;

    vFade = smoothstep(0.0, 2.2, y) * smoothstep(0.0, 3.5, uHeight - y);
  }
`

const frag = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFade;

  void main() {
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float core = smoothstep(0.0, 0.65, edge);
    float ends = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    float a = core * ends * vFade * uOpacity * 0.55;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vec3(0.66, 0.79, 1.0), a);
  }
`

/** Rain toggle — a second instanced quad field with fast vertical streaks. */
export default function Rain({ quality = 'high', active = false }) {
  const count = QUALITY[quality].rain
  const matRef = useRef()
  const fade = useRef(0)

  const height = 24

  const geometry = useMemo(() => {
    const rng = mulberry32(909)
    const base = new THREE.PlaneGeometry(1, 1)

    const g = new THREE.InstancedBufferGeometry()
    g.setIndex(base.index)
    g.setAttribute('position', base.attributes.position)
    g.setAttribute('uv', base.attributes.uv)

    const offsets = new Float32Array(count * 3)
    const rands = new Float32Array(count * 2)

    for (let i = 0; i < count; i++) {
      offsets[i * 3] = rand(rng, -42, 42)
      offsets[i * 3 + 1] = rand(rng, -24, 18)
      offsets[i * 3 + 2] = rng()
      rands[i * 2] = rng()
      rands[i * 2 + 1] = rng()
    }

    g.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    g.setAttribute('aRand', new THREE.InstancedBufferAttribute(rands, 2))
    g.instanceCount = count
    return g
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector3(0.5, 0, 0.2) },
      uHeight: { value: height },
      uLength: { value: 0.85 },
      uWidth: { value: 0.016 },
      uOpacity: { value: 0 },
    }),
    []
  )

  useFrame((state, delta) => {
    const target = active ? 1 : 0
    fade.current += (target - fade.current) * (1 - Math.exp(-delta * 2.2))
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
      matRef.current.uniforms.uOpacity.value = fade.current
    }
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={3} visible={active || fade.current > 0.01}>
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
