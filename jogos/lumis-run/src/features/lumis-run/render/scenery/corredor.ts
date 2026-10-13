import * as THREE from 'three'
import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, canvasTexture, ceiling, ceilingLight, finish, grain, H, HW, L, shade, wall, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 1: corredor da escola, com armários, salas, murais e estantes. */
const C = {
  wall: '#E3CDAA',
  lower: '#5C9C95',
  trim: '#F1E2C6',
  base: '#465466',
  ceiling: '#D3D6DA',
  lightFrame: '#9EA7B3',
  panel: '#FFE2A6',
  door: '#B9824A',
  board: '#2D5A4C',
  cork: '#C48F55',
  glass: '#BFD8EE',
  roomFloor: '#B98E62',
  roomWall: '#E9D6B4',
  desk: '#D6A766',
  leg: '#4B5868',
}
const LOCKERS = ['#6E98D3', '#DC88AE', '#E1B158', '#58B590', '#9783D6', '#E7975F']
const BRANDS = Object.values(BRAND).slice(0, 6)
const UPPER = 2.9
const W = { wall: C.wall, lower: C.lower, trim: C.trim, base: C.base }

function common(): SidePiece {
  const b = builders()
  ceiling(b, C.ceiling, shade(C.ceiling, 0.85))
  for (const side of [-1, 1]) {
    b.o.box(0.3, H - UPPER, L, C.wall, [side * (HW + 0.15), (UPPER + H) / 2, -L / 2])
    for (let i = 0; i < 6; i++) b.o.box(0.04, 0.12, L / 6, BRANDS[i], [side * (HW - 0.02), UPPER + 0.14, -(i + 0.5) * (L / 6)])
  }
  for (const z of [-4, -12]) for (const x of [-2.2, 2.2]) ceilingLight(b, x, z, C.lightFrame, C.panel)
  // bandeirinhas
  const zb = -8
  b.o.cyl(0.012, 0.012, HW * 2, '#7B8798', [0, 4.2, zb], [0, 0, Math.PI / 2], 6)
  for (let i = 0; i < 11; i++) {
    const x = -HW + 0.45 + (i * (HW * 2 - 0.9)) / 10
    const sag = 0.18 * (1 - Math.pow((2 * i) / 10 - 1, 2))
    b.o.add(new THREE.ConeGeometry(0.16, 0.32, 3), BRANDS[i % 6], [x, 4.2 - 0.17 - sag * 0.6, zb], [Math.PI, Math.PI / 6, 0], [1, 1, 0.25])
  }
  return finish(b)
}

function lockers(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(11 + side)
  wall(b, side, 0, -L, W, 0, UPPER)
  const depth = 0.48
  const xFace = side * (HW - depth)
  const w = 0.6
  const start = -0.9
  const count = 24
  let color = LOCKERS[0]
  for (let i = 0; i < count; i++) {
    if (i % 4 === 0) color = LOCKERS[Math.floor(r() * LOCKERS.length)]
    const z = start - i * w - w / 2
    const h = 1.95
    b.o.box(depth, h, w - 0.03, color, [side * (HW - depth / 2), 0.08 + h / 2, z])
    const dark = shade(color, 0.62)
    for (let s = 0; s < 3; s++) b.o.box(0.012, 0.025, w * 0.55, dark, [xFace - side * 0.006, 1.72 - s * 0.06, z])
    b.o.box(0.03, 0.12, 0.035, '#3E4A5A', [xFace - side * 0.015, 1.1, z + w * 0.3])
    b.o.box(0.012, 0.09, 0.14, '#EFE6D6', [xFace - side * 0.006, 1.42, z])
  }
  b.o.box(depth, 0.08, count * w, shade(C.base, 0.9), [side * (HW - depth / 2), 0.04, start - (count * w) / 2])
  for (let i = 0; i < 6; i++) {
    const z = start - 0.6 - r() * (count * w - 1.2)
    const kind = Math.floor(r() * 3)
    const x = side * (HW - depth / 2)
    if (kind === 0) {
      let y = 2.03
      for (let k = 0; k < 3 + Math.floor(r() * 3); k++) {
        const t = 0.06 + r() * 0.04
        b.o.box(0.32, t, 0.42, BRANDS[Math.floor(r() * 6)], [x, y + t / 2, z], [0, (r() - 0.5) * 0.4, 0])
        y += t
      }
    } else if (kind === 1) {
      b.o.cyl(0.04, 0.06, 0.12, '#6B7787', [x, 2.09, z])
      b.o.sphere(0.2, BRAND.azul, [x, 2.34, z])
      b.o.sphere(0.12, BRAND.verde, [x + 0.08, 2.4, z + 0.06], [1, 0.7, 1])
    } else {
      for (let k = 0; k < 3; k++) b.o.box(0.24, 0.24, 0.24, BRANDS[(k + i) % 6], [x, 2.15 + (k === 2 ? 0.24 : 0), z - 0.27 * (k === 2 ? 0.5 : k)])
    }
  }
  return finish(b)
}

function classroom(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(23 + side)
  const z0 = -2.6
  const z1 = -13.4
  const y0 = 0.95
  const y1 = 2.6
  wall(b, side, 0, z0, W, 0, UPPER)
  wall(b, side, z1, -L, W, 0, UPPER)
  wall(b, side, z0, z1, W, 0, y0)
  wall(b, side, z0, z1, W, y1, UPPER)
  const xf = side * (HW - 0.02)
  const frame = '#E9DCC4'
  b.o.box(0.12, 0.08, z0 - z1 + 0.16, frame, [xf, y0, (z0 + z1) / 2])
  b.o.box(0.12, 0.08, z0 - z1 + 0.16, frame, [xf, y1, (z0 + z1) / 2])
  for (let i = 0; i <= 4; i++) b.o.box(0.12, y1 - y0, 0.08, frame, [xf, (y0 + y1) / 2, z0 - (i * (z0 - z1)) / 4])
  b.g.box(0.02, y1 - y0, z0 - z1, C.glass, [side * (HW + 0.05), (y0 + y1) / 2, (z0 + z1) / 2])
  const rx0 = HW + 0.3
  const depth = 6.2
  const rxc = side * (rx0 + depth / 2)
  const rz0 = -0.6
  const rz1 = -15.4
  const rzc = (rz0 + rz1) / 2
  const rlen = rz0 - rz1
  b.o.box(depth, 0.05, rlen, C.roomFloor, [rxc, -0.02, rzc])
  b.o.box(depth, 0.1, rlen, C.ceiling, [rxc, 3.3, rzc])
  b.o.box(0.2, 3.3, rlen, C.roomWall, [side * (rx0 + depth), 1.65, rzc])
  b.o.box(depth, 3.3, 0.2, C.roomWall, [rxc, 1.65, rz0])
  b.o.box(depth, 3.3, 0.2, C.roomWall, [rxc, 1.65, rz1])
  const xb = side * (rx0 + depth - 0.12)
  b.o.box(0.06, 1.25, 5.4, '#7A5A3C', [xb, 1.65, -8])
  b.o.box(0.08, 1.12, 5.25, C.board, [xb - side * 0.01, 1.65, -8])
  for (let i = 0; i < 4; i++) b.o.box(0.09, 0.025, 0.5 + r() * 1.2, '#D9E8DA', [xb - side * 0.02, 1.95 - i * 0.18, -6.5 - r() * 2.5])
  for (let i = 0; i < 12; i++) b.o.box(0.05, 0.3, 0.3, BRANDS[i % 6], [xb, 2.6, -5.0 - i * 0.55])
  b.e.box(0.04, 1.4, 2.6, '#F6E3B4', [side * (rx0 + depth - 0.1), 1.7, -2.4])
  b.e.box(0.04, 1.4, 2.6, '#F6E3B4', [side * (rx0 + depth - 0.1), 1.7, -13.6])
  for (const z of [-4.5, -11.5]) b.e.box(1.4, 0.03, 0.6, C.panel, [rxc, 3.24, z])
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = side * (rx0 + 1.0 + row * 1.6)
      const z = -3.6 - col * 2.4
      const chair = LOCKERS[(row * 4 + col) % 6]
      b.o.box(0.62, 0.05, 0.9, C.desk, [x, 0.74, z])
      for (const dx of [-0.26, 0.26]) for (const dz of [-0.4, 0.4]) b.o.box(0.035, 0.72, 0.035, C.leg, [x + dx, 0.36, z + dz])
      b.o.box(0.42, 0.04, 0.42, chair, [x - side * 0.5, 0.45, z])
      b.o.box(0.04, 0.4, 0.42, chair, [x - side * 0.72, 0.68, z])
      for (const dz of [-0.18, 0.18]) b.o.box(0.03, 0.45, 0.03, C.leg, [x - side * 0.5, 0.22, z + dz])
      if (r() < 0.6) b.o.box(0.22, 0.04, 0.3, BRANDS[Math.floor(r() * 6)], [x, 0.785, z + (r() - 0.5) * 0.4], [0, r() * 0.6, 0])
    }
  }
  const xt = side * (rx0 + depth - 1.3)
  b.o.box(0.8, 0.75, 1.6, shade(C.desk, 0.8), [xt, 0.375, -11.5])
  b.o.cyl(0.03, 0.08, 0.14, '#5B6676', [xt, 0.82, -11.1])
  b.o.sphere(0.17, BRAND.azul, [xt, 1.05, -11.1])
  b.o.cyl(0.18, 0.14, 0.4, BRAND.laranja, [side * (rx0 + depth - 0.4), 0.2, -14.6])
  b.o.sphere(0.32, '#3FA866', [side * (rx0 + depth - 0.4), 0.65, -14.6])
  return finish(b)
}

function doorBoard(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(37 + side)
  wall(b, side, 0, -L, W, 0, UPPER)
  const xf = side * (HW - 0.03)
  for (const [zc, frame] of [[-3.2, BRAND.azul], [-13.6, BRAND.roxo]] as const) {
    b.o.box(0.08, 2.45, 1.5, frame, [xf, 1.225, zc])
    b.o.box(0.1, 2.25, 1.25, C.door, [xf - side * 0.02, 1.13, zc])
    b.o.box(0.11, 0.55, 0.42, '#24376B', [xf - side * 0.025, 1.65, zc])
    b.o.box(0.14, 0.05, 0.16, '#3B4656', [xf - side * 0.05, 1.05, zc + 0.45])
    b.o.box(0.05, 0.22, 0.6, '#EFE6D6', [xf - side * 0.01, 2.62, zc])
    b.o.box(0.06, 0.08, 0.36, frame, [xf - side * 0.015, 2.62, zc])
  }
  const z0 = -5.4
  const z1 = -11.4
  const zc = (z0 + z1) / 2
  b.o.box(0.06, 1.35, z0 - z1 + 0.14, '#8A6038', [xf, 1.85, zc])
  b.o.box(0.07, 1.22, z0 - z1, C.cork, [xf - side * 0.005, 1.85, zc])
  for (let i = 0; i < 14; i++) {
    const w = 0.35 + r() * 0.35
    const h = 0.25 + r() * 0.3
    const z = z0 - 0.4 - r() * (z0 - z1 - 0.8)
    const y = 1.4 + r() * 0.9
    b.o.box(0.075, h, w, LOCKERS[Math.floor(r() * 6)], [xf - side * 0.01, y, z], [(r() - 0.5) * 0.25, 0, 0])
    b.o.sphere(0.025, BRAND.rosa, [xf - side * 0.05, y + h / 2 - 0.05, z])
  }
  b.o.cyl(0.26, 0.26, 0.06, '#EFE6D6', [xf - side * 0.02, 2.6, -8.4], [0, 0, Math.PI / 2], 24)
  b.o.box(0.08, 0.14, 0.02, '#1E2633', [xf - side * 0.07, 2.65, -8.4])
  b.o.box(0.08, 0.02, 0.11, '#1E2633', [xf - side * 0.07, 2.6, -8.45])
  b.o.box(0.45, 0.06, 2.2, C.door, [side * (HW - 0.35), 0.46, -8.4])
  for (const dz of [-0.9, 0.9]) b.o.box(0.4, 0.44, 0.06, '#4B5868', [side * (HW - 0.35), 0.22, -8.4 + dz])
  for (const [k, col] of [BRAND.azul, BRAND.verde, BRAND.amarelo].entries()) b.o.cyl(0.18, 0.16, 0.6, col, [side * (HW - 0.28), 0.3, -1.0 - 0.42 * k], undefined, 14)
  return finish(b)
}

export function bookshelfRun(b: B, side: number, r: () => number, wood: string, z0 = -1.6, z1 = -14.4, height = 2.3) {
  const depth = 0.42
  const xc = side * (HW - depth / 2)
  const len = z0 - z1
  const zc = (z0 + z1) / 2
  b.o.box(depth, height, 0.06, wood, [xc, height / 2, z0])
  b.o.box(depth, height, 0.06, wood, [xc, height / 2, z1])
  b.o.box(0.04, height, len, shade(wood, 0.7), [side * (HW - 0.02), height / 2, zc])
  const shelves: number[] = []
  for (let y = 0.06; y < height; y += 0.54) shelves.push(y)
  shelves.push(height - 0.04)
  for (const y of shelves) b.o.box(depth, 0.05, len, wood, [xc, y, zc])
  for (let s = 0; s < shelves.length - 1; s++) {
    let z = z0 - 0.08
    const room = shelves[s + 1] - shelves[s] - 0.06
    while (z > z1 + 0.1) {
      const t = 0.04 + r() * 0.05
      if (r() < 0.06) {
        z -= 0.25
        continue
      }
      const h = Math.min(room, 0.3 + r() * 0.16)
      b.o.box(depth * 0.82, h, t, shade(BRANDS[Math.floor(r() * 6)], 0.75 + r() * 0.2), [xc, shelves[s] + 0.025 + h / 2, z - t / 2], [r() < 0.05 ? 0.25 : 0, 0, 0])
      z -= t + 0.004
    }
  }
  return { xc, top: height }
}

function bookshelf(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(53 + side)
  wall(b, side, 0, -L, W, 0, UPPER)
  const { xc } = bookshelfRun(b, side, r, '#A8743F')
  for (const z of [-3, -8, -12.5]) {
    b.o.cyl(0.14, 0.11, 0.26, BRAND.rosa, [xc, 2.4, z])
    b.o.sphere(0.24, '#3FA866', [xc, 2.66, z], [1, 0.8, 1])
  }
  return finish(b)
}

function floor() {
  return canvasTexture(512, (g, px) => {
    const tiles = 4
    const t = px / tiles
    const accents = ['#7C9FCB', '#D4AE55', '#6DB596', '#D58FAE']
    for (let i = 0; i < tiles; i++) {
      for (let j = 0; j < tiles; j++) {
        g.fillStyle = (i + j) % 2 ? '#CFBEA0' : '#C2AE8E'
        if (i === 1 && j === 2) g.fillStyle = accents[0]
        if (i === 3 && j === 0) g.fillStyle = accents[1]
        g.fillRect(i * t, j * t, t, t)
      }
    }
    blotches(g, px, 'rgba(90,60,30,0.08)', 10, 3)
    grain(g, px, 0.05, 11)
    g.strokeStyle = 'rgba(70,58,44,0.45)'
    g.lineWidth = 3
    for (let i = 0; i <= tiles; i++) {
      g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, px); g.stroke()
      g.beginPath(); g.moveTo(0, i * t); g.lineTo(px, i * t); g.stroke()
    }
  })
}

export const corredor: ScenarioDef = {
  name: 'Corredor da escola',
  outdoor: false,
  atmosphere: {
    skyTop: '#A9A08F',
    horizon: '#B9A98E',
    fogNear: 26,
    fogFar: 105,
    hemiSky: '#FFF3E2',
    hemiGround: '#E6D8BE',
    hemi: 1.9,
    sun: '#FFE2B8',
    sunIntensity: 1.9,
    sunDir: [-3.5, 9, 2],
    fill: '#BFD3FF',
    fillIntensity: 0.4,
  },
  floor,
  floorRoughness: 0.5,
  common,
  sides: [lockers, classroom, doorBoard, bookshelf],
  facade: { wall: '#E3CDAA', frame: '#5C9C95', sign: '#5C9C95', signText: '#FFFFFF' },
}
