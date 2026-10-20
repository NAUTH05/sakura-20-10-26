import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()
const _c = new THREE.Color()

/**
 * Thin wrapper around <instancedMesh> that accepts a plain array of
 * transforms so repeated geometry (trees, petals, buildings, grass…)
 * can be described declaratively without hundreds of draw calls.
 *
 * item = { p:[x,y,z], r?:[x,y,z], q?:[x,y,z,w], s?:number|[x,y,z], c?:color }
 */
export default function Instanced({
  items,
  children,
  geometry,
  castShadow = false,
  receiveShadow = false,
  frustumCulled = true,
}) {
  const ref = useRef()

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh || !items?.length) return

    items.forEach((it, i) => {
      _p.set(it.p[0], it.p[1], it.p[2])
      if (it.q) _q.set(it.q[0], it.q[1], it.q[2], it.q[3])
      else {
        _e.set(it.r?.[0] ?? 0, it.r?.[1] ?? 0, it.r?.[2] ?? 0)
        _q.setFromEuler(_e)
      }
      if (typeof it.s === 'number') _s.setScalar(it.s)
      else _s.set(it.s?.[0] ?? 1, it.s?.[1] ?? 1, it.s?.[2] ?? 1)

      _m.compose(_p, _q, _s)
      mesh.setMatrixAt(i, _m)

      if (it.c) mesh.setColorAt(i, _c.set(it.c))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [items])

  // an empty list must render nothing — otherwise the identity matrix
  // leaves a stray instance sitting at the world origin
  if (!items?.length) return null

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={frustumCulled}
    >
      {children}
    </instancedMesh>
  )
}
