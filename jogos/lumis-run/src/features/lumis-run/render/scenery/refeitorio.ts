import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, canvasTexture, ceiling, ceilingLight, finish, grain, H, HW, L, shade, wall, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 6: refeitório, com mesas compridas, balcão de comida e frutas. */
const W = { wall: '#F0D49A', lower: '#D9744C', trim: '#F6E6C4', base: '#7A3E2A' }
const TABLE = '#E0B070'
const FRUITS = ['#E8483B', '#F2A33A', '#F5D547', '#7BC65A', '#C2408A']

function common(): SidePiece {
  const b = builders()
  ceiling(b, '#D8CDB8', '#B39E7C')
  for (const z of [-4, -12]) for (const x of [-2.2, 2.2]) ceilingLight(b, x, z, '#B39E7C', '#FFE6B8', 1.4, 1.4)
  // varal de bandeirinhas de festa junina
  for (const z of [-2, -10]) {
    b.o.cyl(0.01, 0.01, HW * 2, '#7A5236', [0, 3.9, z], [0, 0, Math.PI / 2], 4)
    for (let i = 0; i < 14; i++) b.o.box(0.32, 0.36, 0.01, Object.values(BRAND)[i % 6], [-HW + 0.35 + i * 0.67, 3.68, z])
  }
  return finish(b)
}

function tray(b: B, x: number, y: number, z: number, r: () => number) {
  b.o.box(0.42, 0.03, 0.3, ['#E86A5A', '#5AA9E6', '#7BC65A'][Math.floor(r() * 3)], [x, y + 0.015, z])
  b.o.cyl(0.09, 0.07, 0.04, '#F6EFE2', [x - 0.08, y + 0.05, z], undefined, 12)
  b.o.sphere(0.05, FRUITS[Math.floor(r() * 5)], [x + 0.1, y + 0.08, z + 0.05])
  b.o.cyl(0.035, 0.03, 0.12, '#F6EFE2', [x + 0.12, y + 0.09, z - 0.08], undefined, 8)
}

function mesas(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(601 + side)
  wall(b, side, 0, -L, W, 0, H)
  const x = side * (HW - 0.65)
  for (const zc of [-4, -12]) {
    b.o.box(0.9, 0.06, 5.2, TABLE, [x, 0.76, zc])
    for (const dz of [-2.3, 2.3]) b.o.box(0.08, 0.74, 0.08, '#5B6676', [x, 0.37, zc + dz])
    // banco do lado da parede
    b.o.box(0.32, 0.05, 5.0, '#5AA9E6', [x + side * 0.6, 0.46, zc])
    for (const dz of [-2.2, 2.2]) b.o.box(0.06, 0.44, 0.06, '#5B6676', [x + side * 0.6, 0.22, zc + dz])
    for (let z = zc - 2; z < zc + 2.2; z += 0.8) if (r() < 0.7) tray(b, x, 0.79, z, r)
  }
  // cartazes de alimentação saudável
  for (const z of [-8]) {
    b.o.box(0.05, 1.1, 1.6, '#F6EFE2', [side * (HW - 0.03), 2.2, z])
    for (let k = 0; k < 4; k++) b.o.sphere(0.12, FRUITS[k], [side * (HW - 0.06), 2.35 - (k % 2) * 0.35, z - 0.35 + Math.floor(k / 2) * 0.7], [0.4, 1, 1])
  }
  return finish(b)
}

function balcao(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(611 + side)
  wall(b, side, 0, -L, W, 0, H)
  const x = side * (HW - 0.45)
  b.o.box(0.9, 0.95, 12, '#C9CED4', [x, 0.475, -8])
  b.o.box(0.95, 0.05, 12.05, '#9AA3AD', [x, 0.97, -8])
  // proteção de vidro
  b.g.box(0.02, 0.5, 12, '#CFE6EE', [x - side * 0.3, 1.3, -8], [0, 0, side * 0.25])
  // panelas e cubas com comida
  for (let z = -3; z > -14; z -= 1.4) {
    const food = ['#F2C14E', '#7BC65A', '#E8483B', '#F6EFE2', '#B5651D'][Math.floor(r() * 5)]
    b.o.box(0.5, 0.08, 1.1, '#B9C0C8', [x, 1.02, z])
    b.o.box(0.44, 0.03, 1.0, food, [x, 1.065, z])
  }
  // pilha de bandejas e cesta de frutas
  for (let k = 0; k < 6; k++) b.o.box(0.42, 0.025, 0.3, ['#E86A5A', '#5AA9E6', '#7BC65A'][k % 3], [side * (HW - 0.4), 1.0 + k * 0.03, -1.2])
  b.o.cyl(0.3, 0.22, 0.18, '#B5823F', [side * (HW - 0.45), 1.09, -14.5], undefined, 14)
  for (let k = 0; k < 7; k++) b.o.sphere(0.08, FRUITS[k % 5], [side * (HW - 0.45) + (r() - 0.5) * 0.3, 1.22 + r() * 0.06, -14.5 + (r() - 0.5) * 0.3])
  // cardápio na parede
  b.o.box(0.06, 1.0, 2.2, '#2F5D50', [side * (HW - 0.03), 2.6, -8])
  for (let i = 0; i < 4; i++) b.o.box(0.065, 0.06, 1.2 + r() * 0.6, '#F6EFE2', [side * (HW - 0.04), 2.9 - i * 0.2, -8])
  return finish(b)
}

function geladeira(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(621 + side)
  wall(b, side, 0, -L, W, 0, H)
  // geladeira de sucos com porta de vidro iluminada
  const x = side * (HW - 0.4)
  b.o.box(0.8, 2.1, 1.4, '#E9EDF1', [x, 1.05, -3])
  b.e.box(0.02, 1.5, 1.1, '#DFF3FF', [x - side * 0.41, 1.15, -3])
  for (const y of [0.6, 1.0, 1.4, 1.8]) for (let k = 0; k < 4; k++) b.o.cyl(0.05, 0.05, 0.22, FRUITS[(k + Math.round(y * 5)) % 5], [x - side * 0.3, y, -3.4 + k * 0.26], undefined, 8)
  b.o.box(0.06, 0.25, 1.4, BRAND.azul, [x - side * 0.4, 2.0, -3])
  // bebedouro e lixeiras de reciclagem
  b.o.box(0.5, 1.0, 0.5, '#BFC6CF', [side * (HW - 0.25), 0.5, -6.5])
  b.o.box(0.42, 0.06, 0.42, '#8E98A5', [side * (HW - 0.25), 1.03, -6.5])
  for (const [k, c] of [BRAND.azul, BRAND.verde, BRAND.amarelo, '#E8483B'].entries()) b.o.cyl(0.2, 0.18, 0.75, c, [side * (HW - 0.25), 0.38, -8.5 - k * 0.48], undefined, 12)
  // mesinha redonda com cadeiras
  const tx = side * (HW - 1.0)
  b.o.cyl(0.55, 0.55, 0.05, TABLE, [tx, 0.74, -12.5], undefined, 24)
  b.o.cyl(0.05, 0.08, 0.72, '#5B6676', [tx, 0.36, -12.5], undefined, 10)
  for (const dz of [-0.8, 0.8]) {
    b.o.box(0.4, 0.05, 0.4, BRAND.laranja, [tx, 0.45, -12.5 + dz])
    b.o.box(0.4, 0.45, 0.05, BRAND.laranja, [tx, 0.7, -12.5 + dz * 1.25])
  }
  tray(b, tx, 0.77, -12.5, r)
  return finish(b)
}

function janela(side: number): SidePiece {
  const b = builders()
  const z0 = -2.5
  const z1 = -13.5
  wall(b, side, 0, z0, W, 0, H)
  wall(b, side, z1, -L, W, 0, H)
  wall(b, side, z0, z1, W, 0, 1.0)
  wall(b, side, z0, z1, W, 3.2, H)
  b.e.box(0.05, 2.2, z0 - z1, '#CFE7F4', [side * (HW + 0.3), 2.1, (z0 + z1) / 2])
  for (let i = 0; i <= 6; i++) b.o.box(0.1, 2.2, 0.08, '#F6E6C4', [side * (HW - 0.02), 2.1, z0 - (i * (z0 - z1)) / 6])
  b.o.box(0.32, 0.08, z0 - z1, '#F6E6C4', [side * (HW - 0.1), 1.0, (z0 + z1) / 2])
  // vasos de temperos no parapeito
  for (let z = z0 - 0.8; z > z1 + 0.5; z -= 1.4) {
    b.o.cyl(0.12, 0.1, 0.18, '#C9774A', [side * (HW - 0.12), 1.13, z])
    b.o.sphere(0.16, shade('#4E9B58', 0.9 + (z % 2) * 0.05), [side * (HW - 0.12), 1.32, z])
  }
  return finish(b)
}

function checker() {
  return canvasTexture(512, (g, px) => {
    const n = 8
    const t = px / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = (i + j) % 2 ? '#B9694A' : '#D8C6A2'
      g.fillRect(i * t, j * t, t, t)
    }
    blotches(g, px, 'rgba(70,40,20,0.08)', 12, 17)
    grain(g, px, 0.06, 61)
  })
}

export const refeitorio: ScenarioDef = {
  name: 'Refeitório',
  outdoor: false,
  atmosphere: {
    skyTop: '#A98C62',
    horizon: '#BC9E72',
    fogNear: 26,
    fogFar: 105,
    hemiSky: '#FFF0D6',
    hemiGround: '#E1C69A',
    hemi: 1.8,
    sun: '#FFE4B8',
    sunIntensity: 1.8,
    sunDir: [-4, 9, 2],
    fill: '#FFE0C0',
    fillIntensity: 0.4,
  },
  floor: checker,
  floorRoughness: 0.4,
  common,
  sides: [mesas, balcao, geladeira, janela],
  facade: { wall: '#F0D49A', frame: '#D9744C', sign: '#D9744C', signText: '#FFFFFF' },
}
