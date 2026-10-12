import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORRIDOR } from '../config/gameConfig'
import { SCENE_COLORS } from '../config/palette'
import { variantFor, visibleSegments } from '../core/segments'
import { edgeShadeTexture } from './ContactShadows'
import { buildCommon, buildSide, floorTexture, SIDE_VARIANTS, type SidePiece } from './corridorBuilder'

const L = CORRIDOR.segmentLength
const SLOTS = CORRIDOR.segmentsAhead + CORRIDOR.segmentsBehind + 1

/**
 * Corredor infinito: um número fixo de "vagas" de segmento que são
 * reposicionadas conforme a distância avança (object pooling). Nada é criado
 * ou destruído durante a corrida.
 */
export function Corridor({ getDistance }: { getDistance: () => number }) {
  const slots = useRef<THREE.Group[]>([])

  const res = useMemo(() => {
    const opaque = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 })
    const emissive = new THREE.MeshBasicMaterial({ vertexColors: true })
    const glass = new THREE.MeshStandardMaterial({ color: SCENE_COLORS.glass, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false })
    const tex = floorTexture()
    tex.repeat.set(CORRIDOR.width / 4, L / 4)
    const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 })
    const floorGeo = new THREE.PlaneGeometry(CORRIDOR.width, L)
    floorGeo.rotateX(-Math.PI / 2)
    floorGeo.translate(0, 0, -L / 2)
    // oclusão de ambiente falsa: o chão escurece junto às paredes
    const aoTex = edgeShadeTexture()
    const aoMat = new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })
    const aoGeo = new THREE.BufferGeometry()
    {
      const W = 1.1
      const parts: THREE.BufferGeometry[] = []
      for (const side of [-1, 1]) {
        const g = new THREE.PlaneGeometry(W, L)
        g.rotateX(-Math.PI / 2)
        if (side === 1) g.rotateY(Math.PI)
        g.translate(side * (CORRIDOR.width / 2 - W / 2), 0.008, -L / 2)
        parts.push(g)
      }
      const pos: number[] = []
      const uv: number[] = []
      for (const g of parts) {
        const ng = g.toNonIndexed()
        pos.push(...(ng.attributes.position.array as Float32Array))
        uv.push(...(ng.attributes.uv.array as Float32Array))
      }
      aoGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      aoGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    }
    const common = buildCommon()
    const sides: Record<'-1' | '1', SidePiece[]> = {
      '-1': SIDE_VARIANTS.map((v) => buildSide(v, -1)),
      '1': SIDE_VARIANTS.map((v) => buildSide(v, 1)),
    }
    return { opaque, emissive, glass, tex, floorMat, floorGeo, common, sides, aoTex, aoMat, aoGeo }
  }, [])

  useEffect(
    () => () => {
      const all = [res.common, ...res.sides['-1'], ...res.sides['1']]
      for (const p of all) {
        p.opaque.dispose()
        p.emissive.dispose()
        p.glass.dispose()
      }
      res.floorGeo.dispose()
      res.tex.dispose()
      res.aoGeo.dispose()
      res.aoTex.dispose()
      res.aoMat.dispose()
      for (const m of [res.opaque, res.emissive, res.glass, res.floorMat]) m.dispose()
    },
    [res],
  )

  useFrame(() => {
    const segs = visibleSegments(getDistance())
    for (let i = 0; i < SLOTS; i++) {
      const g = slots.current[i]
      if (!g) continue
      const { k, z } = segs[i]
      g.position.z = z
      const vl = variantFor(k, -1)
      const vr = variantFor(k, 1)
      // filhos: [0] comum, [1..4] lado esquerdo, [5..8] lado direito
      for (let v = 0; v < SIDE_VARIANTS.length; v++) {
        g.children[1 + v].visible = v === vl
        g.children[1 + SIDE_VARIANTS.length + v].visible = v === vr
      }
    }
  })

  const piece = (p: SidePiece, key: string) => (
    <group key={key}>
      <mesh geometry={p.opaque} material={res.opaque} receiveShadow />
      {p.emissive.attributes.position && <mesh geometry={p.emissive} material={res.emissive} />}
      {p.glass.attributes.position && <mesh geometry={p.glass} material={res.glass} renderOrder={3} />}
    </group>
  )

  return (
    <group>
      {Array.from({ length: SLOTS }, (_, i) => (
        <group key={i} ref={(g) => { if (g) slots.current[i] = g }}>
          <group>
            <mesh geometry={res.floorGeo} material={res.floorMat} receiveShadow />
            <mesh geometry={res.common.opaque} material={res.opaque} receiveShadow />
            <mesh geometry={res.common.emissive} material={res.emissive} />
            <mesh geometry={res.aoGeo} material={res.aoMat} renderOrder={1} />
          </group>
          {res.sides['-1'].map((p, v) => piece(p, 'l' + v))}
          {res.sides['1'].map((p, v) => piece(p, 'r' + v))}
        </group>
      ))}
    </group>
  )
}
