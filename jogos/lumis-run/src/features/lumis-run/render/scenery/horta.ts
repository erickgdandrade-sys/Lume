import * as THREE from 'three'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, bush, canvasTexture, finish, grain, HW, L, picketFence, shade, tree, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 8: horta da escola, ao ar livre, com canteiros, girassóis e estufa. */
const GRASS = '#5F9B4C'
const SOIL = '#6E4A2F'
const PLANK = '#9C6B3F'

function common(): SidePiece {
  const b = builders()
  for (const side of [-1, 1]) {
    // borda de madeira do caminho e gramado
    b.o.box(0.18, 0.22, L, PLANK, [side * (HW + 0.09), 0.11, -L / 2])
    b.o.box(30, 0.1, L, GRASS, [side * (HW + 0.18 + 15), 0.05, -L / 2])
    // tufos de grama na beirada
    const r = mulberry32(800 + side)
    for (let i = 0; i < 10; i++) b.o.sphere(0.14, shade(GRASS, 0.85 + r() * 0.3), [side * (HW + 0.4 + r() * 0.6), 0.12, -r() * L], [1.4, 0.6, 1])
  }
  // pedras de passagem no meio do caminho de terra
  for (let z = 1; z < L; z += 2.6) for (const x of [-2.2, 0, 2.2]) b.o.cyl(0.32, 0.36, 0.05, '#A9A39A', [x + ((z * 7) % 3) * 0.1 - 0.1, 0.02, -z], undefined, 8)
  return finish(b, null)
}

function bed(b: B, x: number, z: number, len: number, plant: 'alface' | 'cenoura' | 'tomate', r: () => number) {
  b.o.box(1.4, 0.4, len, PLANK, [x, 0.25, z])
  b.o.box(1.24, 0.06, len - 0.16, SOIL, [x, 0.45, z])
  for (let zz = z - len / 2 + 0.3; zz < z + len / 2 - 0.2; zz += 0.42) {
    for (const dx of [-0.35, 0.35]) {
      const px = x + dx
      if (plant === 'alface') b.o.sphere(0.17, shade('#7CC45A', 0.85 + r() * 0.3), [px, 0.55, zz], [1, 0.6, 1])
      else if (plant === 'cenoura') {
        for (let k = 0; k < 3; k++) b.o.box(0.03, 0.28, 0.06, '#5DAF4A', [px + (k - 1) * 0.04, 0.62, zz], [0, k, (k - 1) * 0.3])
        b.o.add(new THREE.ConeGeometry(0.05, 0.12, 8), '#E8812F', [px, 0.5, zz], [Math.PI, 0, 0])
      } else {
        b.o.cyl(0.015, 0.015, 0.8, '#7A5A3C', [px, 0.85, zz], undefined, 4)
        b.o.sphere(0.16, '#4E9B48', [px, 0.85, zz], [1, 1.4, 1])
        for (let k = 0; k < 3; k++) b.o.sphere(0.055, '#E2433A', [px + (r() - 0.5) * 0.2, 0.7 + r() * 0.35, zz + (r() - 0.5) * 0.2])
      }
    }
  }
}

function canteiros(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(811 + side)
  bed(b, side * (HW + 1.4), -3.8, 6, 'alface', r)
  bed(b, side * (HW + 1.4), -12, 6, 'cenoura', r)
  bed(b, side * (HW + 3.4), -8, 12, 'tomate', r)
  // placas dos canteiros
  for (const [z, c] of [[-0.6, '#E2B53E'], [-8.8, '#E8812F']] as const) {
    b.o.box(0.04, 0.6, 0.04, PLANK, [side * (HW + 0.6), 0.3, z])
    b.o.box(0.03, 0.25, 0.45, c, [side * (HW + 0.6), 0.65, z])
  }
  // regador
  b.o.cyl(0.16, 0.18, 0.28, '#3F86D9', [side * (HW + 0.55), 0.14, -6.2], undefined, 12)
  b.o.cyl(0.02, 0.03, 0.35, '#3F86D9', [side * (HW + 0.35), 0.28, -6.2], [0, 0, side * 0.9], 6)
  return finish(b, null)
}

function girassois(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(821 + side)
  for (let i = 0; i < 14; i++) {
    const x = side * (HW + 0.8 + r() * 2.4)
    const z = -0.6 - i * 1.1 - r() * 0.3
    const h = 1.5 + r() * 0.8
    b.o.cyl(0.03, 0.04, h, '#4E8F3A', [x, h / 2, z], undefined, 6)
    b.o.sphere(0.14, '#4E8F3A', [x, h * 0.5, z + 0.12], [1, 0.3, 1.6])
    // flor virada para o caminho
    const fx = x - side * 0.06
    b.o.cyl(0.3, 0.3, 0.05, '#F5C431', [fx, h + 0.05, z], [0, 0, Math.PI / 2 + side * 0.3], 12)
    b.o.cyl(0.14, 0.14, 0.07, '#6B3E1F', [fx - side * 0.02, h + 0.05, z], [0, 0, Math.PI / 2 + side * 0.3], 12)
  }
  picketFence(b, side * (HW + 3.6), 0, -L, '#E9DDC6')
  for (const z of [-4, -12]) bush(b, side * (HW + 4.6), z, 1.1, '#4E9B58')
  return finish(b, null)
}

function pomar(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(831 + side)
  picketFence(b, side * (HW + 0.8), -0.5, -L + 0.5, '#E9DDC6')
  for (const z of [-4, -12]) {
    const x = side * (HW + 3.4)
    tree(b, x, z, 1.15, '#4C9A5B', '#7A5236', r)
    for (let k = 0; k < 9; k++) b.o.sphere(0.09, k % 3 ? '#D9372F' : '#F2A33A', [x + (r() - 0.5) * 2, 2.2 + r() * 1.1, z + (r() - 0.5) * 2])
    b.o.sphere(0.09, '#D9372F', [x + 0.6, 0.09, z + 0.4])
  }
  // carrinho de mão com abóboras
  const wx = side * (HW + 1.8)
  b.o.box(0.8, 0.35, 1.1, '#3F86D9', [wx, 0.55, -8])
  b.o.cyl(0.18, 0.18, 0.08, '#2E2E33', [wx, 0.2, -7.3], [0, 0, Math.PI / 2], 12)
  for (const dz of [-0.2, 0.2]) b.o.sphere(0.2, '#E8812F', [wx, 0.82, -8.1 + dz], [1, 0.75, 1])
  return finish(b, null)
}

function estufa(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(841 + side)
  const x = side * (HW + 3.2)
  const z = -8
  const w = 4
  const len = 10
  // estrutura e vidros
  for (let zz = z - len / 2; zz <= z + len / 2 + 0.01; zz += 2.5) {
    for (const dx of [-w / 2, w / 2]) b.o.box(0.08, 2.2, 0.08, '#E8ECEF', [x + dx, 1.1, zz])
    b.o.box(w, 0.08, 0.08, '#E8ECEF', [x, 2.2, zz])
    b.o.box(0.08, 0.08, 0.08, '#E8ECEF', [x, 3.0, zz])
  }
  for (const s of [-1, 1]) {
    b.g.box(0.03, 2.2, len, '#CFE8D8', [x + (s * w) / 2, 1.1, z])
    b.g.box(w * 0.58, 0.03, len, '#CFE8D8', [x + (s * w) / 4, 2.6, z], [0, 0, -s * 0.38])
  }
  b.o.box(0.08, 0.08, len, '#E8ECEF', [x, 3.0, z])
  // mudas lá dentro
  for (let k = 0; k < 10; k++) b.o.sphere(0.2, shade('#5DAF4A', 0.8 + r() * 0.4), [x + (r() - 0.5) * 3, 0.25, z - 4.5 + k])
  // espantalho
  const sx = side * (HW + 1.0)
  b.o.cyl(0.04, 0.04, 1.9, '#7A5A3C', [sx, 0.95, -1.8], undefined, 6)
  b.o.box(0.05, 0.05, 1.2, '#7A5A3C', [sx, 1.45, -1.8])
  b.o.box(0.24, 0.55, 0.5, '#C2408A', [sx, 1.3, -1.8])
  b.o.sphere(0.17, '#E9C98A', [sx, 1.78, -1.8])
  b.o.cyl(0.32, 0.32, 0.03, '#D9B35A', [sx, 1.9, -1.8], undefined, 14)
  b.o.cyl(0.14, 0.17, 0.18, '#D9B35A', [sx, 2.0, -1.8], undefined, 14)
  return finish(b, null)
}

function dirt() {
  return canvasTexture(512, (g, px) => {
    g.fillStyle = '#9C7650'
    g.fillRect(0, 0, px, px)
    blotches(g, px, 'rgba(70,45,25,0.25)', 16, 23)
    blotches(g, px, 'rgba(200,170,120,0.15)', 10, 29)
    const r = mulberry32(99)
    for (let i = 0; i < 180; i++) {
      g.fillStyle = `rgba(${150 + r() * 60},${130 + r() * 50},${100 + r() * 40},0.8)`
      g.beginPath()
      g.arc(r() * px, r() * px, 1 + r() * 3, 0, Math.PI * 2)
      g.fill()
    }
    grain(g, px, 0.14, 81)
  })
}

export const horta: ScenarioDef = {
  name: 'Horta da escola',
  outdoor: true,
  atmosphere: {
    skyTop: '#5C9BD6',
    horizon: '#B3CBB8',
    fogNear: 34,
    fogFar: 125,
    hemiSky: '#DDEEFF',
    hemiGround: '#7E9A5C',
    hemi: 1.5,
    sun: '#FFE9C2',
    sunIntensity: 2.5,
    sunDir: [5, 10, 4],
    fill: '#D2E6FF',
    fillIntensity: 0.35,
  },
  floor: dirt,
  floorRoughness: 0.95,
  common,
  sides: [canteiros, girassois, pomar, estufa],
  facade: { wall: '#C9A57C', frame: '#4E8F3A', sign: '#4E8F3A', signText: '#FFFFFF' },
}
