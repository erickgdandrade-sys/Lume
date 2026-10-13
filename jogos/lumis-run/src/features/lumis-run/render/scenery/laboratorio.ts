import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, canvasTexture, ceiling, ceilingLight, finish, grain, H, HW, L, wall, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 5: laboratório de ciências, com bancadas, frascos e tabela periódica. */
const W = { wall: '#BFD0D2', lower: '#3E7C88', trim: '#E8F0EE', base: '#2C4A52' }
const TOP = '#2E3338'
const CAB = '#C9D3D4'
const LIQUIDS = ['#4FD1A5', '#5AA9F0', '#F06A9B', '#F5B33E', '#A07CF0']

function common(): SidePiece {
  const b = builders()
  ceiling(b, '#AEBBC0', '#8C9AA0')
  for (const z of [-4, -12]) for (const x of [-2.2, 2.2]) ceilingLight(b, x, z, '#8C99A0', '#EAF4FF', 2.2, 0.6)
  // dutos do exaustor no teto
  for (const side of [-1, 1]) b.o.cyl(0.22, 0.22, L, '#AEB9BF', [side * 3.4, H - 0.35, -L / 2], [Math.PI / 2, 0, 0], 14)
  // faixa de segurança no chão
  for (const side of [-1, 1]) b.o.box(0.14, 0.006, L, '#E8C547', [side * (HW - 0.6), 0.004, -L / 2])
  return finish(b)
}

function flask(b: B, x: number, y: number, z: number, c: string, r: () => number) {
  const k = r()
  if (k < 0.35) {
    // erlenmeyer
    b.g.cyl(0.03, 0.11, 0.22, '#D9EEF5', [x, y + 0.11, z], undefined, 10)
    b.o.cyl(0.02, 0.095, 0.1, c, [x, y + 0.05, z], undefined, 10)
  } else if (k < 0.7) {
    // béquer
    b.g.cyl(0.08, 0.08, 0.2, '#D9EEF5', [x, y + 0.1, z], undefined, 10)
    b.o.cyl(0.07, 0.07, 0.11, c, [x, y + 0.055, z], undefined, 10)
  } else {
    // balão redondo
    b.o.sphere(0.1, c, [x, y + 0.1, z])
    b.g.cyl(0.025, 0.025, 0.16, '#D9EEF5', [x, y + 0.26, z], undefined, 8)
  }
}

function bench(b: B, side: number, z0: number, z1: number, r: () => number) {
  const d = 0.75
  const x = side * (HW - d / 2)
  const len = z0 - z1
  b.o.box(d, 0.85, len, CAB, [x, 0.425, (z0 + z1) / 2])
  b.o.box(d + 0.06, 0.06, len + 0.04, TOP, [x, 0.88, (z0 + z1) / 2])
  for (let z = z0 - 0.5; z > z1; z -= 0.9) b.o.box(0.02, 0.06, 0.4, '#8C99A0', [x - side * (d / 2 + 0.01), 0.7, z])
  for (let z = z0 - 0.4; z > z1 + 0.2; z -= 0.42) if (r() < 0.75) flask(b, x + (r() - 0.5) * 0.3, 0.91, z, LIQUIDS[Math.floor(r() * 5)], r)
  return x
}

function bancada(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(501 + side)
  wall(b, side, 0, -L, W, 0, H)
  const x = bench(b, side, -0.6, -15.4, r)
  // microscópio
  const mz = -8
  b.o.box(0.25, 0.04, 0.3, '#3A4048', [x, 0.93, mz])
  b.o.box(0.05, 0.35, 0.08, '#3A4048', [x + side * 0.08, 1.1, mz])
  b.o.cyl(0.04, 0.04, 0.28, '#E6ECEB', [x, 1.22, mz], [0, 0, side * 0.5], 10)
  // prateleiras com frascos na parede
  for (const y of [1.7, 2.3]) {
    b.o.box(0.32, 0.04, L - 1.2, '#B9C6CA', [side * (HW - 0.16), y, -L / 2])
    for (let z = -1; z > -L + 1; z -= 0.5) if (r() < 0.6) flask(b, side * (HW - 0.16), y + 0.02, z, LIQUIDS[Math.floor(r() * 5)], r)
  }
  return finish(b)
}

function armario(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(509 + side)
  wall(b, side, 0, -L, W, 0, H)
  for (const zc of [-4, -12]) {
    const x = side * (HW - 0.3)
    b.o.box(0.6, 2.5, 3.2, '#DCE3E2', [x, 1.25, zc])
    b.g.box(0.04, 2.2, 3.0, '#CFE8F0', [x - side * 0.31, 1.3, zc])
    for (const y of [0.6, 1.2, 1.8]) {
      b.o.box(0.5, 0.03, 3.0, '#B9C6CA', [x, y, zc])
      for (let z = zc - 1.3; z < zc + 1.3; z += 0.36) if (r() < 0.7) flask(b, x, y + 0.02, z, LIQUIDS[Math.floor(r() * 5)], r)
    }
    b.o.box(0.62, 0.06, 3.22, '#3E7C88', [x, 2.52, zc])
  }
  // esqueleto de modelo (simplificado) no meio
  const sx = side * (HW - 0.55)
  b.o.cyl(0.03, 0.03, 1.2, '#E9E3D3', [sx, 0.9, -8], undefined, 8)
  b.o.sphere(0.14, '#E9E3D3', [sx, 1.75, -8], [0.9, 1.05, 1])
  for (let i = 0; i < 5; i++) b.o.box(0.05, 0.03, 0.34 - Math.abs(i - 2) * 0.04, '#E9E3D3', [sx, 1.4 - i * 0.08, -8])
  b.o.box(0.05, 0.03, 0.5, '#E9E3D3', [sx, 1.52, -8])
  b.o.box(0.3, 0.05, 0.3, '#3A4048', [sx, 0.3, -8])
  return finish(b)
}

function tabela(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(521 + side)
  wall(b, side, 0, -L, W, 0, H)
  // tabela periódica: grade de quadradinhos coloridos
  const xf = side * (HW - 0.03)
  const z0 = -3.5
  b.o.box(0.04, 1.8, 5.6, '#F3F6F5', [xf, 2.3, z0 - 2.8])
  const cols = 18
  const cw = 5.2 / cols
  const pal = ['#7FB3E6', '#F0A0B8', '#F5CF6E', '#8ED1B0', '#B9A5EE', '#F4B183']
  for (let row = 0; row < 7; row++) {
    for (let c = 0; c < cols; c++) {
      if (row === 0 && c > 0 && c < 17) continue
      if ((row === 1 || row === 2) && c > 1 && c < 12) continue
      b.o.box(0.045, cw * 0.86, cw * 0.86, pal[(c + row * 2) % 6], [xf - side * 0.005, 3.0 - row * cw * 0.95, z0 - 0.2 - c * cw])
    }
  }
  // quadro branco com fórmulas e um átomo
  b.o.box(0.05, 1.3, 3.2, '#F3F6F5', [xf, 1.9, -12])
  for (let i = 0; i < 4; i++) b.o.box(0.055, 0.03, 0.6 + r() * 1.2, '#3A6FB0', [xf, 2.3 - i * 0.22, -11.2 - r() * 0.6])
  b.o.sphere(0.07, BRAND.rosa, [xf - side * 0.04, 1.75, -13])
  for (const rot of [0, 1.05, 2.1]) b.o.box(0.02, 0.02, 0.55, BRAND.azul, [xf - side * 0.04, 1.75, -13], [rot, 0, 0])
  bench(b, side, -14, -15.6, r)
  return finish(b)
}

function pia(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(531 + side)
  wall(b, side, 0, -L, W, 0, H)
  const x = bench(b, side, -0.6, -6, r)
  // pia com torneira
  b.o.box(0.5, 0.05, 0.8, '#9AA6AD', [x, 0.9, -7.2])
  b.o.box(0.5, 0.85, 1.2, CAB, [x, 0.425, -7.2])
  b.o.cyl(0.02, 0.02, 0.35, '#B9C6CA', [x + side * 0.18, 1.05, -7.2], undefined, 8)
  b.o.box(0.2, 0.02, 0.02, '#B9C6CA', [x + side * 0.08, 1.22, -7.2])
  bench(b, side, -8.4, -15.4, r)
  // plantas em vasos de laboratório e chuveiro de emergência
  for (const z of [-2, -11]) {
    b.o.cyl(0.14, 0.11, 0.24, '#F5B33E', [x, 1.02, z])
    b.o.sphere(0.2, '#3F9A62', [x, 1.28, z])
  }
  b.o.cyl(0.03, 0.03, 2.6, '#3FA86B', [side * (HW - 0.2), 1.3, -15.6], undefined, 8)
  b.o.cyl(0.18, 0.12, 0.08, '#3FA86B', [side * (HW - 0.45), 2.6, -15.6], undefined, 12)
  return finish(b)
}

function tiles() {
  return canvasTexture(512, (g, px) => {
    const n = 8
    const t = px / n
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        g.fillStyle = (i + j) % 2 ? '#8FA0A8' : '#7F929B'
        if ((i * 7 + j * 3) % 11 === 0) g.fillStyle = '#6E9AA6'
        g.fillRect(i * t, j * t, t, t)
      }
    }
    blotches(g, px, 'rgba(40,60,70,0.07)', 10, 13)
    grain(g, px, 0.05, 51)
    g.strokeStyle = 'rgba(50,62,70,0.4)'
    g.lineWidth = 2
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, px); g.stroke()
      g.beginPath(); g.moveTo(0, i * t); g.lineTo(px, i * t); g.stroke()
    }
  })
}

export const laboratorio: ScenarioDef = {
  name: 'Laboratório de ciências',
  outdoor: false,
  atmosphere: {
    skyTop: '#7D9098',
    horizon: '#93A7AE',
    fogNear: 26,
    fogFar: 105,
    hemiSky: '#EAF6FF',
    hemiGround: '#B5C4C6',
    hemi: 1.8,
    sun: '#F2F8FF',
    sunIntensity: 1.7,
    sunDir: [-3, 9, 2],
    fill: '#CFE4FF',
    fillIntensity: 0.45,
  },
  floor: tiles,
  floorRoughness: 0.3,
  common,
  sides: [bancada, armario, tabela, pia],
  facade: { wall: '#BFD0D2', frame: '#3E7C88', sign: '#3E7C88', signText: '#FFFFFF' },
}
