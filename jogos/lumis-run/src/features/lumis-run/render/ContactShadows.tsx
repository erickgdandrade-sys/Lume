import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { laneX } from '../config/gameConfig'
import { OBSTACLES, type ObstacleKind } from '../core/obstacles'
import type { SimState } from '../core/sim'
import { radialTexture } from './lumisGeometry'

const MAX_OBS = 64
const MAX_BOOKS = 48

/** tamanho da sombra de contato (largura x profundidade) por tipo de obstáculo */
const FOOT: Record<ObstacleKind, [number, number]> = {
  livros: [1.6, 1.3],
  carteira: [1.8, 1.4],
  caixas: [2.0, 1.7],
  carrinho: [2.1, 1.9],
  barreira: [7.6, 0.9],
  faixa: [0, 0], // pendurada: sem sombra no chão
  placa: [1.9, 0.7],
}

/**
 * Sombras de contato suaves sob os obstáculos e sob os livros flutuantes.
 * Funcionam em qualquer nível de qualidade (são só planos com gradiente) e
 * ancoram os objetos no chão. A sombra do livro fica mais fraca quanto mais
 * alto ele flutua.
 */
export function ContactShadows({ getSim }: { getSim: () => SimState | null }) {
  const obs = useRef<THREE.InstancedMesh>(null!)
  const books = useRef<THREE.InstancedMesh>(null!)
  const res = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1)
    geo.rotateX(-Math.PI / 2)
    const tex = radialTexture('rgba(30,27,45,0.5)', 'rgba(30,27,45,0)')
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    const bookTex = radialTexture('rgba(30,27,45,0.34)', 'rgba(30,27,45,0)')
    const bookMat = new THREE.MeshBasicMaterial({ map: bookTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    return { geo, tex, mat, bookTex, bookMat }
  }, [])
  useEffect(() => () => {
    res.geo.dispose()
    res.tex.dispose()
    res.bookTex.dispose()
    res.mat.dispose()
    res.bookMat.dispose()
  }, [res])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const s = getSim()
    let n = 0
    let nb = 0
    if (s) {
      for (const o of s.gen.obstacles) {
        const z = s.distance - o.d
        if (z > 8) continue
        if (z < -125 || n >= MAX_OBS) break
        const [w, d] = FOOT[o.kind]
        if (!w) continue
        p.set(OBSTACLES[o.kind].span === 'todas' ? 0 : laneX(o.lane), 0.015, z)
        sc.set(w, 1, d)
        m.compose(p, q, sc)
        obs.current.setMatrixAt(n++, m)
      }
      for (const b of s.gen.books) {
        if (b.taken) continue
        const z = s.distance - b.d
        if (z > 3) continue
        if (z < -110 || nb >= MAX_BOOKS) break
        const k = 1 / (1 + Math.max(0, b.y - 0.6) * 0.45)
        p.set(laneX(b.lane), 0.014, z)
        sc.set(0.7 * k, 1, 0.58 * k)
        m.compose(p, q, sc)
        books.current.setMatrixAt(nb++, m)
      }
    }
    obs.current.count = n
    books.current.count = nb
    obs.current.instanceMatrix.needsUpdate = true
    books.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={obs} args={[res.geo, res.mat, MAX_OBS]} frustumCulled={false} renderOrder={1} />
      <instancedMesh ref={books} args={[res.geo, res.bookMat, MAX_BOOKS]} frustumCulled={false} renderOrder={1} />
    </group>
  )
}

/** textura de gradiente linear (escuro na borda, transparente no meio) */
export function edgeShadeTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 4
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 64, 0)
  grad.addColorStop(0, 'rgba(40,30,50,0.42)')
  grad.addColorStop(0.35, 'rgba(40,30,50,0.14)')
  grad.addColorStop(1, 'rgba(40,30,50,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
