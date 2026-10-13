import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORRIDOR } from '../config/gameConfig'
import { hashInt } from '../core/rng'
import { visibleSegments } from '../core/segments'
import { edgeShadeTexture } from './ContactShadows'
import { scenarioAssets } from './scenery'

const L = CORRIDOR.segmentLength
const SLOTS = CORRIDOR.segmentsAhead + CORRIDOR.segmentsBehind + 1

type Slot = {
  group: THREE.Group
  floor: THREE.Mesh
  ao: THREE.Mesh
  parts: THREE.Mesh[] // comum (opaco, emissivo, vidro), esquerda (3), direita (3)
}

/** variação de cada lado do segmento k, estável para o mesmo k */
function variantFor(k: number, side: -1 | 1, count: number) {
  // o primeiro segmento é sempre o primeiro tipo, para o menu ter um fundo previsível
  if (k <= 0) return 0
  return hashInt(k, side === -1 ? 7 : 13) % count
}

/**
 * Cenário infinito: um número fixo de "vagas" de segmento que são
 * reposicionadas conforme a distância avança (object pooling). Cada vaga
 * troca de geometria quando o segmento muda de cenário ou de variação;
 * nada é criado ou destruído durante a corrida.
 *
 * @param sceneAt cenário (0..9) do segmento que começa na distância da vista dada
 */
export function Corridor({ getDistance, sceneAt }: { getDistance: () => number; sceneAt: (viewD: number) => number }) {
  const slots = useRef<Slot[]>([])

  const res = useMemo(() => {
    const opaque = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 })
    const emissive = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    const glass = new THREE.MeshStandardMaterial({ color: '#BFD8EE', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false })
    const floorGeo = new THREE.PlaneGeometry(CORRIDOR.width, L)
    floorGeo.rotateX(-Math.PI / 2)
    floorGeo.translate(0, 0, -L / 2)
    // oclusão de ambiente falsa: o chão escurece junto às laterais
    const aoTex = edgeShadeTexture()
    const aoMat = new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 })
    const aoGeo = new THREE.BufferGeometry()
    {
      const W = 1.1
      const pos: number[] = []
      const uv: number[] = []
      for (const side of [-1, 1]) {
        const g = new THREE.PlaneGeometry(W, L)
        g.rotateX(-Math.PI / 2)
        if (side === 1) g.rotateY(Math.PI)
        g.translate(side * (CORRIDOR.width / 2 - W / 2), 0.008, -L / 2)
        const ng = g.toNonIndexed()
        pos.push(...(ng.attributes.position.array as Float32Array))
        uv.push(...(ng.attributes.uv.array as Float32Array))
      }
      aoGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
      aoGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    }
    return { opaque, emissive, glass, floorGeo, aoTex, aoMat, aoGeo }
  }, [])

  useEffect(
    () => () => {
      for (const d of [res.opaque, res.emissive, res.glass, res.floorGeo, res.aoTex, res.aoMat, res.aoGeo]) d.dispose()
    },
    [res],
  )

  useFrame(() => {
    const segs = visibleSegments(getDistance())
    for (let i = 0; i < SLOTS; i++) {
      const s = slots.current[i]
      if (!s) continue
      const { k, z } = segs[i]
      s.group.position.z = z
      const a = scenarioAssets(sceneAt(k * L + 0.01))
      s.floor.material = a.floorMat
      const count = a.sides['-1'].length
      const pieces = [a.common, a.sides['-1'][variantFor(k, -1, count)], a.sides['1'][variantFor(k, 1, count)]]
      for (let p = 0; p < 3; p++) {
        const piece = pieces[p]
        const geos = [piece.opaque, piece.emissive, piece.glass]
        for (let j = 0; j < 3; j++) {
          const mesh = s.parts[p * 3 + j]
          if (mesh.geometry !== geos[j]) mesh.geometry = geos[j]
          mesh.visible = !!geos[j].attributes.position
        }
      }
    }
  })

  const mats = [res.opaque, res.emissive, res.glass]
  return (
    <group>
      {Array.from({ length: SLOTS }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            if (!g) return
            const meshes = g.children as THREE.Mesh[]
            slots.current[i] = { group: g, floor: meshes[0], ao: meshes[1], parts: meshes.slice(2) }
          }}
        >
          <mesh geometry={res.floorGeo} receiveShadow />
          <mesh geometry={res.aoGeo} material={res.aoMat} renderOrder={1} />
          {Array.from({ length: 9 }, (_, j) => (
            <mesh key={j} material={mats[j % 3]} receiveShadow={j % 3 === 0} renderOrder={j % 3 === 2 ? 3 : 0} />
          ))}
        </group>
      ))}
    </group>
  )
}
