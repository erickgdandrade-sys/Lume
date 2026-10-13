import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GeoBuilder } from './geoBuilder'
import { mix, shade, textTexture } from './scenery/kit'
import { scenarioDef } from './scenery'

/**
 * Fachada com uma janela grande entre um nível e o outro. A Lumis pula pela
 * janela para chegar ao próximo cenário; a placa em cima diz para onde ela vai.
 */
const OPEN_W = 3.9 // meia largura do vão
const SILL = 0.7
const TOP = 3.4
const WALL_W = 14
const WALL_H = 7.6

function facadeGeometry(i: number) {
  const f = scenarioDef(i).facade
  const g = new GeoBuilder()
  const T = 0.4
  const z = -T / 2
  const side = (WALL_W - OPEN_W) / 2
  // parede com o vão
  g.box(side, WALL_H, T, f.wall, [-(OPEN_W + side / 2), WALL_H / 2, z])
  g.box(side, WALL_H, T, f.wall, [OPEN_W + side / 2, WALL_H / 2, z])
  g.box(OPEN_W * 2, SILL, T, f.wall, [0, SILL / 2, z])
  g.box(OPEN_W * 2, WALL_H - TOP, T, f.wall, [0, (TOP + WALL_H) / 2, z])
  // faixas e rodapé para dar escala
  const dark = shade(f.wall, 0.78)
  g.box(WALL_W * 2, 0.35, T + 0.06, dark, [0, 0.175, z])
  g.box(WALL_W * 2, 0.16, T + 0.1, shade(f.wall, 1.08), [0, WALL_H - 0.08, z])
  g.box(WALL_W * 2, 0.08, T + 0.04, dark, [0, 5.4, z])
  // moldura da janela, peitoril e bandeira
  const fr = f.frame
  g.box(0.22, TOP - SILL + 0.44, 0.34, fr, [-OPEN_W - 0.11, (TOP + SILL) / 2, 0.02])
  g.box(0.22, TOP - SILL + 0.44, 0.34, fr, [OPEN_W + 0.11, (TOP + SILL) / 2, 0.02])
  g.box(OPEN_W * 2 + 0.44, 0.22, 0.34, fr, [0, TOP + 0.11, 0.02])
  g.box(OPEN_W * 2 + 0.6, 0.12, 0.6, shade(fr, 1.15), [0, SILL - 0.04, 0.12])
  // venezianas abertas
  for (const s of [-1, 1]) {
    const x = s * (OPEN_W + 0.22 + 0.95)
    g.box(1.9, TOP - SILL, 0.08, mix(fr, '#FFFFFF', 0.15), [x, (TOP + SILL) / 2, 0.12])
    for (let y = SILL + 0.2; y < TOP - 0.1; y += 0.22) g.box(1.7, 0.05, 0.1, shade(fr, 0.8), [x, y, 0.16])
  }
  // cortinas presas nas laterais, do lado de dentro
  for (const s of [-1, 1]) {
    g.box(0.55, TOP - SILL - 0.1, 0.12, mix(fr, '#F4E9DA', 0.55), [s * (OPEN_W - 0.3), (TOP + SILL) / 2 + 0.05, -0.45], [0, 0, s * 0.04])
    g.box(0.6, 0.12, 0.16, shade(fr, 0.9), [s * (OPEN_W - 0.3), SILL + 1.1, -0.45])
  }
  // jardineiras com flores nos cantos do peitoril
  for (const s of [-1, 1]) {
    g.box(1.1, 0.3, 0.4, shade(fr, 0.85), [s * (OPEN_W + 1.2), 0.15 + 0.35, 0.35])
    for (let k = 0; k < 5; k++) g.sphere(0.13, ['#E8607E', '#F2B33D', '#8F6FD8', '#5BB0E8', '#E8607E'][k], [s * (OPEN_W + 0.8 + k * 0.2), 0.75, 0.38])
  }
  return g.build()
}

export function Portal({ get }: { get: () => { z: number; scene: number } | null }) {
  const group = useRef<THREE.Group>(null!)
  const wall = useRef<THREE.Mesh>(null!)
  const sign = useRef<THREE.Mesh>(null!)
  const res = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })
    const signGeo = new THREE.PlaneGeometry(3.6, 0.68)
    const geos = new Map<number, THREE.BufferGeometry>()
    const signs = new Map<number, THREE.MeshStandardMaterial>()
    return { mat, signGeo, geos, signs }
  }, [])
  useEffect(
    () => () => {
      res.mat.dispose()
      res.signGeo.dispose()
      for (const g of res.geos.values()) g.dispose()
      for (const m of res.signs.values()) {
        m.map?.dispose()
        m.dispose()
      }
    },
    [res],
  )

  useFrame(() => {
    const p = get()
    group.current.visible = !!p
    if (!p) return
    group.current.position.z = p.z
    let geo = res.geos.get(p.scene)
    if (!geo) res.geos.set(p.scene, (geo = facadeGeometry(p.scene)))
    let sm = res.signs.get(p.scene)
    if (!sm) {
      const d = scenarioDef(p.scene)
      sm = new THREE.MeshStandardMaterial({ map: textTexture(d.name, d.facade.sign, d.facade.signText), roughness: 0.6 })
      res.signs.set(p.scene, sm)
    }
    wall.current.geometry = geo
    sign.current.material = sm
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={wall} material={res.mat} castShadow receiveShadow />
      <mesh ref={sign} geometry={res.signGeo} position={[0, 4.0, 0.06]} />
    </group>
  )
}
