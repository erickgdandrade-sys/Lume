import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laneX } from '../config/gameConfig'
import { BRAND } from '../config/palette'
import type { SimState } from '../core/sim'
import { collectibleBook } from './obstacleModels'
import { radialTexture } from './lumisGeometry'

const MAX = 48
const COLORS = [BRAND.azul, BRAND.rosa, BRAND.amarelo, BRAND.verde, BRAND.roxo, BRAND.laranja].map((c) => new THREE.Color(c))

/** Pilhas de livros coletáveis (deitadas e pequenas): giram, flutuam e têm um brilho suave. */
export function Books({ getSim }: { getSim: () => SimState | null }) {
  const c0 = useRef<THREE.InstancedMesh>(null!)
  const c1 = useRef<THREE.InstancedMesh>(null!)
  const c2 = useRef<THREE.InstancedMesh>(null!)
  const pages = useRef<THREE.InstancedMesh>(null!)
  const glows = useRef<THREE.InstancedMesh>(null!)
  const res = useMemo(() => {
    const { covers, pages } = collectibleBook()
    const coverMat = new THREE.MeshStandardMaterial({ roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0.08 })
    const pageMat = new THREE.MeshStandardMaterial({ color: '#FFFDF2', roughness: 0.8 })
    const glowGeo = new THREE.PlaneGeometry(0.8, 0.8)
    const glowMat = new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,226,120,0.32)', 'rgba(255,226,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    return { covers, pages, coverMat, pageMat, glowGeo, glowMat }
  }, [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(1, 1, 1), [])

  useFrame((state) => {
    const s = getSim()
    const t = state.clock.elapsedTime
    let n = 0
    if (s) {
      for (const b of s.gen.books) {
        if (b.taken) continue
        const z = s.distance - b.d
        if (z > 3) continue
        if (z < -110 || n >= MAX) break
        p.set(laneX(b.lane), b.y + Math.sin(t * 2.4 + b.id) * 0.08, z)
        e.set(0.12, t * 1.8 + b.id * 0.7, 0)
        q.setFromEuler(e)
        m.compose(p, q, sc)
        const cov = [c0.current, c1.current, c2.current]
        cov.forEach((c, i) => {
          c.setMatrixAt(n, m)
          c.setColorAt(n, COLORS[(b.color + i * 2) % COLORS.length])
        })
        pages.current.setMatrixAt(n, m)
        // brilho voltado para a câmera
        q.identity()
        m.compose(p, q, sc)
        glows.current.setMatrixAt(n, m)
        n++
      }
    }
    const cov = [c0.current, c1.current, c2.current]
    for (const mesh of [...cov, pages.current, glows.current]) {
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    for (const c of cov) if (c.instanceColor) c.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={glows} args={[res.glowGeo, res.glowMat, MAX]} frustumCulled={false} renderOrder={4} />
      {[c0, c1, c2].map((r, i) => (
        <instancedMesh key={i} ref={r} args={[res.covers[i], res.coverMat, MAX]} frustumCulled={false} castShadow />
      ))}
      <instancedMesh ref={pages} args={[res.pages, res.pageMat, MAX]} frustumCulled={false} />
    </group>
  )
}
