import * as THREE from 'three'
import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, bush, canvasTexture, finish, grain, HW, L, parkBench, picketFence, shade, streetLamp, tree, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 2: a rua da escola, ao ar livre, com casas, muro pintado e ônibus escolar. */
const SIDEWALK = '#B3ACA0'
const CURB = '#8E8A84'
const GRASS = '#6E9F55'
const HOUSES = ['#D98E6A', '#7FA9C9', '#E2BE6A', '#9C8BC9', '#7DB68E', '#D47F95']
const ROOFS = ['#8E4A3C', '#5D4A6E', '#4F5D73', '#7A4B3A']

function common(): SidePiece {
  const b = builders()
  for (const side of [-1, 1]) {
    // meio-fio, calçada com juntas e gramado
    b.o.box(0.3, 0.2, L, CURB, [side * (HW + 0.15), 0.1, -L / 2])
    b.o.box(3.2, 0.16, L, SIDEWALK, [side * (HW + 1.9), 0.08, -L / 2])
    for (let z = 0; z < L; z += 2) b.o.box(3.2, 0.005, 0.04, shade(SIDEWALK, 0.8), [side * (HW + 1.9), 0.162, -z])
    b.o.box(26, 0.1, L, GRASS, [side * (HW + 3.5 + 13), 0.05, -L / 2])
    // faixa amarela da borda
    b.o.box(0.12, 0.006, L, '#E2B53E', [side * (HW - 0.35), 0.004, -L / 2])
  }
  // faixas tracejadas entre as pistas
  for (const x of [-1.1, 1.1]) for (let z = 0.5; z < L; z += 4) b.o.box(0.12, 0.006, 2, '#E9E4DA', [x, 0.004, -z - 1])
  return finish(b, null)
}

function house(b: B, side: number, z: number, w: number, color: string, roof: string, r: () => number) {
  const x = side * (HW + 3.5 + 3.2)
  const d = 5.5
  const h = 3.2 + r() * 1.2
  b.o.box(d, h, w, color, [x, h / 2 + 0.1, z])
  // telhado de duas águas: oitão triangular na cor da casa e duas águas inclinadas
  const run = d / 2 + 0.35
  const rise = 1.5
  const tri = new THREE.Shape()
  tri.moveTo(-d / 2, 0)
  tri.lineTo(d / 2, 0)
  tri.lineTo(0, rise - 0.12)
  tri.closePath()
  b.o.add(new THREE.ExtrudeGeometry(tri, { depth: w, bevelEnabled: false }), shade(color, 0.92), [x, h + 0.1, z - w / 2])
  const ang = Math.atan2(rise, run)
  const slab = Math.hypot(run, rise)
  for (const s of [-1, 1]) b.o.box(slab, 0.16, w + 0.5, roof, [x + (s * run) / 2, h + 0.1 + rise / 2 - 0.12, z], [0, 0, -s * ang])
  b.o.box(0.2, 0.2, w + 0.5, shade(roof, 0.8), [x, h + 0.1 + rise - 0.06, z])
  const fx = side * (HW + 3.5 + 3.2 - d / 2 - 0.02)
  // porta e janelas com luz quente
  b.o.box(0.08, 1.9, 0.95, shade(color, 0.55), [fx, 1.05, z + w * 0.2])
  for (const wz of [z - w * 0.22, z + w * 0.2]) {
    const wy = wz === z + w * 0.2 ? 2.6 : 1.6
    if (wy > h - 0.3) continue
    b.o.box(0.1, 1.0, 1.1, '#F3EEE4', [fx, wy, wz])
    b.g.box(0.04, 0.85, 0.95, '#A9CBE8', [fx - side * 0.04, wy, wz])
  }
  picketFence(b, side * (HW + 3.3), z + w / 2, z - w / 2, '#EDE3D2')
  bush(b, side * (HW + 3.9), z - w * 0.3, 0.9, '#4E8F4A')
}

function casas(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(211 + side)
  house(b, side, -4.2, 6.5, HOUSES[Math.floor(r() * 6)], ROOFS[Math.floor(r() * 4)], r)
  house(b, side, -12, 6.2, HOUSES[Math.floor(r() * 6)], ROOFS[Math.floor(r() * 4)], r)
  tree(b, side * (HW + 2.6), -8.2, 0.9, '#4C9A5B', '#7A5236', r)
  streetLamp(b, side * (HW + 0.6), -1.5, side)
  return finish(b, null)
}

function muro(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(223 + side)
  const x = side * (HW + 3.6)
  const wallC = '#E8D7B6'
  b.o.box(0.3, 2.4, L, wallC, [x, 1.2, -L / 2])
  b.o.box(0.4, 0.14, L, shade(wallC, 0.8), [x, 2.45, -L / 2])
  // mural colorido pintado no muro
  const fx = x - side * 0.16
  for (let i = 0; i < 9; i++) {
    const z = -1 - i * 1.7
    const c = Object.values(BRAND)[i % 6]
    if (i % 3 === 0) b.o.cyl(0.55, 0.55, 0.02, c, [fx, 1.3, z], [0, 0, Math.PI / 2], 20)
    else if (i % 3 === 1) b.o.box(0.02, 0.9, 0.9, c, [fx, 1.2, z], [Math.PI / 4, 0, 0])
    else b.o.add(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 5), c, [fx, 1.3, z], [0, 0, Math.PI / 2])
  }
  b.o.box(0.03, 0.18, L - 1, '#5C9C95', [fx, 0.45, -L / 2])
  // prédio da escola atrás do muro
  const bx = side * (HW + 3.6 + 6)
  b.o.box(9, 7.2, L - 1, '#D9A774', [bx, 3.6, -L / 2])
  b.o.box(9.4, 0.4, L - 0.6, shade('#D9A774', 0.75), [bx, 7.3, -L / 2])
  for (let fl = 0; fl < 2; fl++) {
    for (let i = 0; i < 5; i++) {
      const z = -2 - i * 2.9
      b.o.box(0.1, 1.4, 1.8, '#F4EBDD', [bx - side * 4.52, 2.4 + fl * 2.8, z])
      b.g.box(0.04, 1.2, 1.6, '#9CC2E2', [bx - side * 4.56, 2.4 + fl * 2.8, z])
    }
  }
  tree(b, side * (HW + 2.2), -6, 0.75, '#5AA562', '#7A5236', r)
  return finish(b, null)
}

function praca(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(229 + side)
  for (const z of [-2.5, -10.5]) tree(b, side * (HW + 2.2), z, 0.95 + r() * 0.2, ['#4C9A5B', '#5FA855', '#3F8C59'][Math.floor(r() * 3)], '#7A5236', r)
  parkBench(b, side * (HW + 1.4), -6.5, side)
  // ponto de ônibus com cobertura de vidro
  const x = side * (HW + 2.4)
  for (const dz of [-1.2, 1.2]) b.o.box(0.08, 2.5, 0.08, '#3F4A5C', [x + side * 0.7, 1.25, -13.5 + dz])
  b.o.box(1.6, 0.08, 2.8, '#3F4A5C', [x, 2.5, -13.5])
  b.g.box(0.03, 1.9, 2.4, '#BFD8EE', [x + side * 0.72, 1.3, -13.5])
  b.o.box(0.5, 0.06, 2.0, '#B9844F', [x + side * 0.4, 0.5, -13.5])
  b.o.box(0.05, 0.6, 0.9, BRAND.azul, [x + side * 0.74, 1.8, -12.5])
  // lixeiras coloridas
  for (const [k, c] of [BRAND.azul, BRAND.verde, BRAND.amarelo, BRAND.rosa].entries()) b.o.cyl(0.2, 0.18, 0.75, c, [side * (HW + 0.7), 0.53, -0.8 - k * 0.48], undefined, 12)
  bush(b, side * (HW + 4.4), -6.5, 1.1)
  streetLamp(b, side * (HW + 0.6), -9, side)
  return finish(b, null)
}

function onibus(side: number): SidePiece {
  const b = builders()
  const x = side * (HW + 2.0)
  const z = -8
  const yellow = '#E9B23A'
  b.o.box(2.4, 2.4, 9.6, yellow, [x, 1.65, z])
  b.o.box(2.42, 0.16, 9.62, '#2E2E33', [x, 1.05, z])
  b.o.box(2.2, 0.3, 9.2, shade(yellow, 1.08), [x, 3.0, z])
  // janelas
  for (let i = 0; i < 7; i++) b.o.box(2.44, 0.75, 0.95, '#3E5468', [x, 2.25, z + 3.9 - i * 1.25])
  b.o.box(2.2, 0.9, 0.06, '#3E5468', [x, 2.2, z + 4.82])
  b.o.box(2.44, 0.22, 4.4, '#2E2E33', [x, 1.35, z + 1.6])
  for (const wz of [z + 3.2, z - 3.2]) for (const s of [-1, 1]) b.o.cyl(0.48, 0.48, 0.3, '#24262B', [x + s * 1.1, 0.48, wz], [0, 0, Math.PI / 2], 16)
  b.e.box(0.3, 0.2, 0.04, '#FFE7A8', [x - 0.8, 1.3, z + 4.82])
  b.e.box(0.3, 0.2, 0.04, '#FFE7A8', [x + 0.8, 1.3, z + 4.82])
  b.o.box(0.05, 0.4, 2.2, '#2E2E33', [x - side * 1.23, 2.95, z])
  // placa "escola" na calçada
  b.o.cyl(0.04, 0.04, 2.4, '#5B6676', [side * (HW + 3.9), 1.2, -1.5], undefined, 8)
  b.o.box(0.06, 0.7, 0.7, '#E2B53E', [side * (HW + 3.9), 2.3, -1.5], [Math.PI / 4, 0, 0])
  bush(b, side * (HW + 4.6), -14.5)
  return finish(b, null)
}

function asphalt() {
  return canvasTexture(512, (g, px) => {
    g.fillStyle = '#5C6068'
    g.fillRect(0, 0, px, px)
    blotches(g, px, 'rgba(30,32,38,0.18)', 14, 5)
    blotches(g, px, 'rgba(140,140,135,0.1)', 8, 9)
    grain(g, px, 0.16, 21)
  })
}

export const rua: ScenarioDef = {
  name: 'Rua da escola',
  outdoor: true,
  atmosphere: {
    skyTop: '#5F98D2',
    horizon: '#A9C2D6',
    fogNear: 34,
    fogFar: 128,
    hemiSky: '#D4E6FF',
    hemiGround: '#8E9A72',
    hemi: 1.45,
    sun: '#FFE6BE',
    sunIntensity: 2.5,
    sunDir: [-6, 10, 4],
    fill: '#BFD3FF',
    fillIntensity: 0.35,
  },
  floor: asphalt,
  floorRoughness: 0.85,
  common,
  sides: [casas, muro, praca, onibus],
  facade: { wall: '#D9A774', frame: '#4F7FB0', sign: '#E2B53E', signText: '#2B2B2B' },
}
