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

/** Livros flutuantes coletáveis: giram, flutuam e têm um brilho suave. */
export function Books({ getSim }: { getSim: () => SimState | null }) {
  const covers = useRef<THREE.InstancedMesh>(null!)
  const pages = useRef<THREE.InstancedMesh>(null!)
  const glows = useRef<THREE.InstancedMesh>(null!)
  const res = useMemo(() => {
    const { cover, pages } = collectibleBook()
    const coverMat = new THREE.MeshStandardMaterial({ roughness: 0.45, emissive: '#ffffff', emissiveIntensity: 0.08 })
    const pageMat = new THREE.MeshStandardMaterial({ color: '#FFFDF2', roughness: 0.8 })
    const glowGeo = new THREE.PlaneGeometry(1.05, 1.05)
    const glowMat = new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,226,120,0.38)', 'rgba(255,226,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    return { cover, pages, coverMat, pageMat, glowGeo, glowMat }
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
        e.set(0.15, t * 2.2 + b.id * 0.7, 0)
        q.setFromEuler(e)
        m.compose(p, q, sc)
        covers.current.setMatrixAt(n, m)
        pages.current.setMatrixAt(n, m)
        covers.current.setColorAt(n, COLORS[b.color % COLORS.length])
        // brilho voltado para a câmera
        q.identity()
        m.compose(p, q, sc)
        glows.current.setMatrixAt(n, m)
        n++
      }
    }
    for (const mesh of [covers.current, pages.current, glows.current]) {
      mesh.count = n
      mesh.instanceMatrix.needsUpdate = true
    }
    if (covers.current.instanceColor) covers.current.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={glows} args={[res.glowGeo, res.glowMat, MAX]} frustumCulled={false} renderOrder={4} />
      <instancedMesh ref={covers} args={[res.cover, res.coverMat, MAX]} frustumCulled={false} castShadow />
      <instancedMesh ref={pages} args={[res.pages, res.pageMat, MAX]} frustumCulled={false} />
    </group>
  )
}
