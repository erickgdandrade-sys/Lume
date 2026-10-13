import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { bookshelfRun } from './corredor'
import { blotches, builders, canvasTexture, ceiling, finish, grain, H, HW, L, mix, shade, wall, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 4: biblioteca, com estantes altas, mesas de leitura e luz quente. */
const WOOD = '#8A5A36'
const PANEL = '#6E4A33'
const W = { wall: '#E4CFA8', lower: PANEL, trim: '#B88A55', base: '#4A3324' }
const SPLIT = 1.3

function pendant(b: B, x: number, z: number) {
  b.o.cyl(0.01, 0.01, 0.9, '#3A2E26', [x, H - 0.45, z], undefined, 4)
  b.o.cyl(0.08, 0.32, 0.26, '#2F5D50', [x, H - 1.0, z], undefined, 16)
  b.e.cyl(0.25, 0.25, 0.02, '#FFD68A', [x, H - 1.14, z], undefined, 16)
}

function common(): SidePiece {
  const b = builders()
  ceiling(b, '#CDBB9C', '#9C7A52')
  // vigas de madeira no teto
  for (let z = -2; z > -L; z -= 4) b.o.box(HW * 2, 0.24, 0.3, WOOD, [0, H - 0.12, z])
  for (const z of [-4, -12]) for (const x of [-2.2, 2.2]) pendant(b, x, z)
  // tapete comprido no meio
  b.o.box(6.6, 0.012, L, '#5E3A36', [0, 0.006, -L / 2])
  b.o.box(6.2, 0.014, L, '#7A4A40', [0, 0.007, -L / 2])
  for (const x of [-2.9, 2.9]) b.o.box(0.08, 0.016, L, '#D9B36B', [x, 0.008, -L / 2])
  return finish(b)
}

function estante(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(401 + side)
  wall(b, side, 0, -L, W, 0, H, SPLIT)
  const { xc } = bookshelfRun(b, side, r, WOOD, -0.4, -L + 0.4, 3.3)
  // escadinha encostada e placa da seção
  b.o.box(0.06, 3.0, 0.06, '#5B3A24', [xc - side * 0.35, 1.5, -6], [side * 0.12, 0, 0])
  b.o.box(0.06, 3.0, 0.06, '#5B3A24', [xc - side * 0.35, 1.5, -6.6], [side * 0.12, 0, 0])
  for (let y = 0.3; y < 2.9; y += 0.4) b.o.box(0.05, 0.04, 0.6, '#5B3A24', [xc - side * (0.35 - y * 0.012), y, -6.3])
  b.o.box(0.05, 0.3, 1.4, BRAND.verde, [xc - side * 0.22, 3.55, -10])
  return finish(b)
}

function mesas(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(409 + side)
  wall(b, side, 0, -L, W, 0, H, SPLIT)
  // quadros na parede
  for (const z of [-3, -8, -13]) {
    b.o.box(0.06, 1.0, 1.4, '#B88A55', [side * (HW - 0.03), 2.4, z])
    b.o.box(0.07, 0.84, 1.24, mix(Object.values(BRAND)[Math.floor(r() * 6)], '#E8DCC6', 0.35), [side * (HW - 0.04), 2.4, z])
  }
  for (const z of [-4, -12]) {
    const x = side * (HW - 0.75)
    b.o.box(1.2, 0.08, 2.6, WOOD, [x, 0.78, z])
    for (const dz of [-1.1, 1.1]) b.o.box(1.0, 0.74, 0.1, shade(WOOD, 0.75), [x, 0.37, z + dz])
    // luminárias de mesa verdes
    for (const dz of [-0.7, 0.7]) {
      b.o.cyl(0.02, 0.02, 0.35, '#B88A55', [x, 0.98, z + dz], undefined, 6)
      b.o.cyl(0.14, 0.18, 0.12, '#2F6B4F', [x, 1.16, z + dz], [0, 0, Math.PI / 2], 12)
      b.e.box(0.02, 0.1, 0.28, '#FFE0A0', [x - side * 0.02, 1.1, z + dz])
    }
    // livros abertos e pilhas
    b.o.box(0.4, 0.03, 0.3, '#F2E8D5', [x, 0.835, z - 0.2], [0, 0.3, 0])
    for (let k = 0; k < 3; k++) b.o.box(0.32, 0.07, 0.24, Object.values(BRAND)[(k + 2) % 6], [x - side * 0.3, 0.86 + k * 0.07, z + 0.4], [0, r() * 0.4, 0])
    // cadeiras nas cabeceiras
    for (const s2 of [-1, 1]) {
      const cz = z + s2 * 1.6
      b.o.box(0.45, 0.05, 0.45, '#7E3B3B', [x, 0.48, cz])
      b.o.box(0.45, 0.55, 0.06, WOOD, [x, 0.78, cz + s2 * 0.22])
      for (const a of [-0.18, 0.18]) for (const c of [-0.18, 0.18]) b.o.box(0.04, 0.48, 0.04, shade(WOOD, 0.7), [x + a, 0.24, cz + c])
    }
  }
  return finish(b)
}

function janela(side: number): SidePiece {
  const b = builders()
  const z0 = -3
  const z1 = -13
  const y0 = 0.9
  const y1 = 3.6
  wall(b, side, 0, z0, W, 0, H, SPLIT)
  wall(b, side, z1, -L, W, 0, H, SPLIT)
  wall(b, side, z0, z1, W, 0, y0, SPLIT)
  wall(b, side, z0, z1, W, y1, H, SPLIT)
  const xf = side * (HW - 0.02)
  // janela grande com arco de vitral e luz do dia
  b.e.box(0.05, y1 - y0, z0 - z1, '#CFE3F2', [side * (HW + 0.3), (y0 + y1) / 2, (z0 + z1) / 2])
  for (let i = 0; i <= 5; i++) b.o.box(0.12, y1 - y0, 0.1, WOOD, [xf, (y0 + y1) / 2, z0 - (i * (z0 - z1)) / 5])
  b.o.box(0.12, 0.1, z0 - z1, WOOD, [xf, 2.3, (z0 + z1) / 2])
  b.o.box(0.3, 0.1, z0 - z1 + 0.3, shade(WOOD, 1.1), [side * (HW - 0.12), y0, (z0 + z1) / 2])
  for (let i = 0; i < 5; i++) b.e.box(0.04, 0.36, 1.6, Object.values(BRAND)[i], [side * (HW + 0.25), y1 - 0.25, z0 - 1 - i * 2])
  // cortinas
  for (const z of [z0 - 0.4, z1 + 0.4]) b.o.box(0.16, y1 - y0 + 0.3, 0.8, '#8E3B46', [side * (HW - 0.15), (y0 + y1) / 2 + 0.1, z])
  b.o.box(0.08, 0.08, z0 - z1 + 1.4, '#B88A55', [side * (HW - 0.15), y1 + 0.2, (z0 + z1) / 2])
  // vasos no parapeito
  for (const z of [-5, -8, -11]) {
    b.o.cyl(0.12, 0.1, 0.2, '#C9774A', [side * (HW - 0.15), y0 + 0.15, z])
    b.o.sphere(0.18, '#3F8C59', [side * (HW - 0.15), y0 + 0.38, z])
  }
  return finish(b)
}

function leitura(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(419 + side)
  wall(b, side, 0, -L, W, 0, H, SPLIT)
  bookshelfRun(b, side, r, WOOD, -0.6, -4.4, 1.7)
  bookshelfRun(b, side, r, WOOD, -11.6, -15.4, 1.7)
  // cantinho de leitura: tapete redondo, pufes e globo
  const x = side * (HW - 1.3)
  b.o.cyl(1.3, 1.3, 0.02, '#D9A441', [x, 0.012, -8], undefined, 32)
  b.o.cyl(1.0, 1.0, 0.024, '#7DB0C9', [x, 0.014, -8], undefined, 32)
  for (const [dz, c] of [[-0.8, BRAND.rosa], [0.7, BRAND.azul], [0, BRAND.laranja]] as const) b.o.sphere(0.36, c, [x + (dz === 0 ? side * 0.5 : 0), 0.28, -8 + dz], [1, 0.7, 1])
  b.o.cyl(0.04, 0.12, 0.8, '#5B3A24', [side * (HW - 0.4), 0.4, -6.6])
  b.o.sphere(0.32, '#4F86B8', [side * (HW - 0.4), 1.12, -6.6])
  b.o.sphere(0.2, '#6BAA5A', [side * (HW - 0.43), 1.2, -6.5], [1, 0.8, 0.9])
  // poltrona
  const ax = side * (HW - 0.6)
  b.o.box(0.9, 0.45, 1.0, '#7E3B3B', [ax, 0.32, -10])
  b.o.box(0.25, 0.9, 1.0, '#6E3434', [ax + side * 0.33, 0.6, -10])
  for (const dz of [-0.45, 0.45]) b.o.box(0.9, 0.62, 0.15, '#6E3434', [ax, 0.42, -10 + dz])
  // relógio de parede
  b.o.cyl(0.35, 0.35, 0.06, '#B88A55', [side * (HW - 0.04), 2.9, -8], [0, 0, Math.PI / 2], 24)
  b.o.cyl(0.3, 0.3, 0.07, '#F2E8D5', [side * (HW - 0.05), 2.9, -8], [0, 0, Math.PI / 2], 24)
  return finish(b)
}

function planks() {
  return canvasTexture(512, (g, px) => {
    const rows = 8
    const h = px / rows
    const r = mulberry32(77)
    for (let i = 0; i < rows; i++) {
      let x = -r() * px * 0.5
      while (x < px) {
        const w = px * (0.35 + r() * 0.4)
        const base = 0.85 + r() * 0.2
        g.fillStyle = `rgb(${Math.round(158 * base)},${Math.round(104 * base)},${Math.round(64 * base)})`
        g.fillRect(x, i * h, w, h)
        g.fillStyle = 'rgba(60,35,20,0.5)'
        g.fillRect(x, i * h, 2, h)
        x += w
      }
      g.fillStyle = 'rgba(50,30,15,0.55)'
      g.fillRect(0, i * h, px, 2)
    }
    blotches(g, px, 'rgba(255,220,170,0.06)', 8, 6)
    grain(g, px, 0.08, 41)
  })
}

export const biblioteca: ScenarioDef = {
  name: 'Biblioteca',
  outdoor: false,
  atmosphere: {
    skyTop: '#6E5642',
    horizon: '#8C7155',
    fogNear: 24,
    fogFar: 100,
    hemiSky: '#FFE8C8',
    hemiGround: '#C9A57C',
    hemi: 1.75,
    sun: '#FFD9A0',
    sunIntensity: 1.8,
    sunDir: [-4, 9, 2],
    fill: '#FFD7B0',
    fillIntensity: 0.35,
  },
  floor: planks,
  floorRoughness: 0.45,
  common,
  sides: [estante, mesas, janela, leitura],
  facade: { wall: '#C9A57C', frame: '#2F5D50', sign: '#2F5D50', signText: '#F6E7C8' },
}
