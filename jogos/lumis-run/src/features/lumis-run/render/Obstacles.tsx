import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laneX } from '../config/gameConfig'
import { OBSTACLES, type ObstacleKind } from '../core/obstacles'
import type { SimState } from '../core/sim'
import { OBSTACLE_MODELS } from './obstacleModels'

const KINDS = Object.keys(OBSTACLES) as ObstacleKind[]
const MAX_PER_KIND = 24
const VISIBLE_AHEAD = 125

/** Um InstancedMesh por tipo, com quantidade fixa (pool): nada é criado durante a corrida. */
export function Obstacles({ getSim }: { getSim: () => SimState | null }) {
  const meshes = useRef<Partial<Record<ObstacleKind, THREE.InstancedMesh>>>({})
  const res = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })
    const geos = Object.fromEntries(KINDS.map((k) => [k, OBSTACLE_MODELS[k]()])) as Record<ObstacleKind, THREE.BufferGeometry>
    return { mat, geos }
  }, [])
  useEffect(() => () => {
    res.mat.dispose()
    for (const g of Object.values(res.geos)) g.dispose()
  }, [res])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const e = useMemo(() => new THREE.Euler(), [])

  useFrame(() => {
    const s = getSim()
    const counts: Record<string, number> = {}
    for (const k of KINDS) counts[k] = 0
    if (s) {
      for (const o of s.gen.obstacles) {
        const z = s.distance - o.d
        if (z > 8) continue
        if (z < -VISIBLE_AHEAD) break
        const mesh = meshes.current[o.kind]
        if (!mesh || counts[o.kind] >= MAX_PER_KIND) continue
        const spec = OBSTACLES[o.kind]
        p.set(spec.span === 'todas' ? 0 : laneX(o.lane), 0, z)
        e.set(0, spec.span === 'todas' ? 0 : (o.variant - 1.5) * 0.06, 0)
        q.setFromEuler(e)
        m.compose(p, q, one)
        mesh.setMatrixAt(counts[o.kind]++, m)
      }
    }
    for (const k of KINDS) {
      const mesh = meshes.current[k]
      if (!mesh) continue
      mesh.count = counts[k]
      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {KINDS.map((k) => (
        <instancedMesh
          key={k}
          ref={(r) => { if (r) meshes.current[k] = r }}
          args={[res.geos[k], res.mat, MAX_PER_KIND]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </group>
  )
}
