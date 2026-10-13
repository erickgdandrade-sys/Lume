import * as THREE from 'three'
import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { builders, canvasTexture, ceiling, ceilingLight, finish, grain, H, HW, L, mix, shade, wall, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 7: sala de artes, com cavaletes, tintas, varal de desenhos e argila. */
const W = { wall: '#EFDCC0', lower: '#8E7DBE', trim: '#F7EBD6', base: '#4A3F66' }
const PAINTS = ['#E8483B', '#F2A33A', '#F5D547', '#4FB36B', '#3F86D9', '#9B5CCF', '#E85A9C']

function common(): SidePiece {
  const b = builders()
  ceiling(b, '#D9CDBB', '#B6A68E')
  for (const z of [-4, -12]) for (const x of [-2.2, 2.2]) ceilingLight(b, x, z, '#B6A68E', '#FFF0D0')
  // respingos de tinta pela parede de cima (os dois lados)
  const r = mulberry32(700)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const c = PAINTS[Math.floor(r() * PAINTS.length)]
      b.o.cyl(0.1 + r() * 0.2, 0.1 + r() * 0.2, 0.02, c, [side * (HW - 0.01), 2.9 + r() * 1.2, -0.8 - r() * (L - 1.6)], [0, 0, Math.PI / 2], 12)
    }
  }
  // móbiles coloridos pendurados
  for (const z of [-2, -10]) {
    for (const x of [-1.8, 0, 1.8]) {
      b.o.cyl(0.006, 0.006, 0.6, '#6B5B4B', [x, H - 0.3, z], undefined, 4)
      b.o.add(new THREE.OctahedronGeometry(0.16), PAINTS[Math.floor(r() * PAINTS.length)], [x, H - 0.7, z])
    }
  }
  return finish(b)
}

function easel(b: B, x: number, z: number, side: number, r: () => number) {
  const wood = '#B07B45'
  b.o.box(0.05, 1.8, 0.05, wood, [x, 0.9, z - 0.35], [side * 0.1, 0, 0.1])
  b.o.box(0.05, 1.8, 0.05, wood, [x, 0.9, z + 0.35], [side * 0.1, 0, -0.1])
  b.o.box(0.05, 1.7, 0.05, wood, [x + side * 0.35, 0.85, z], [0, 0, -side * 0.25])
  b.o.box(0.1, 0.05, 0.9, wood, [x - side * 0.04, 0.85, z])
  // tela pintada: fundo, sol, morros
  const cx = x - side * 0.08
  b.o.box(0.04, 0.85, 0.75, '#F6EFE2', [cx, 1.3, z], [0, 0, side * 0.1])
  b.o.box(0.045, 0.4, 0.7, mix(PAINTS[Math.floor(r() * 7)], '#FFFFFF', 0.4), [cx, 1.5, z], [0, 0, side * 0.1])
  b.o.cyl(0.12, 0.12, 0.05, '#F5D547', [cx - side * 0.04, 1.55, z + 0.18], [0, 0, Math.PI / 2 + side * 0.1], 12)
  b.o.sphere(0.25, '#4FB36B', [cx - side * 0.02, 1.08, z - 0.15], [0.12, 0.6, 1.1])
}

function cavaletes(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(701 + side)
  wall(b, side, 0, -L, W, 0, H)
  for (const z of [-2.5, -6.5, -10.5, -14.2]) easel(b, side * (HW - 0.8), z, side, r)
  // banquinhos
  for (const z of [-4.5, -12.5]) {
    b.o.cyl(0.2, 0.2, 0.05, PAINTS[Math.floor(r() * 7)], [side * (HW - 0.6), 0.6, z], undefined, 14)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      b.o.box(0.03, 0.6, 0.03, '#6B5B4B', [side * (HW - 0.6) + Math.cos(a) * 0.14, 0.3, z + Math.sin(a) * 0.14])
    }
  }
  return finish(b)
}

function tintas(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(711 + side)
  wall(b, side, 0, -L, W, 0, H)
  // estante aberta com potes de tinta, pincéis e rolos de papel
  const x = side * (HW - 0.25)
  const z0 = -1
  const z1 = -15
  for (const y of [0.05, 0.65, 1.25, 1.85, 2.45]) b.o.box(0.5, 0.05, z0 - z1, '#C99A63', [x, y, (z0 + z1) / 2])
  for (const z of [z0, z1, (z0 + z1) / 2]) b.o.box(0.5, 2.5, 0.05, '#B07B45', [x, 1.25, z])
  for (const y of [0.1, 0.7, 1.3, 1.9]) {
    for (let z = z0 - 0.25; z > z1 + 0.2; z -= 0.3) {
      if (r() < 0.25) continue
      const c = PAINTS[Math.floor(r() * PAINTS.length)]
      if (r() < 0.7) {
        b.o.cyl(0.1, 0.1, 0.18, '#F2EEE6', [x, y + 0.09, z], undefined, 10)
        b.o.cyl(0.105, 0.105, 0.04, c, [x, y + 0.19, z], undefined, 10)
        b.o.box(0.02, 0.12, 0.18, c, [x - side * 0.1, y + 0.08, z])
      } else {
        b.o.cyl(0.07, 0.07, 0.45, mix(c, '#FFFFFF', 0.5), [x, y + 0.08, z], [Math.PI / 2, 0, 0], 10)
      }
    }
  }
  // pote de pincéis em cima
  for (let z = -3; z > -14; z -= 3.5) {
    b.o.cyl(0.08, 0.07, 0.16, '#3F86D9', [x, 2.58, z], undefined, 10)
    for (let k = 0; k < 5; k++) b.o.box(0.015, 0.3, 0.015, ['#B07B45', '#E8483B', '#F5D547'][k % 3], [x + (k - 2) * 0.02, 2.75, z + (k % 2) * 0.02], [0, 0, (k - 2) * 0.12])
  }
  return finish(b)
}

function varal(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(721 + side)
  wall(b, side, 0, -L, W, 0, H)
  // varal de desenhos presos com pregadores
  for (const y of [2.6, 3.4]) {
    b.o.box(0.01, 0.01, L - 0.8, '#6B5B4B', [side * (HW - 0.12), y, -L / 2])
    for (let z = -0.9; z > -L + 0.9; z -= 0.75) {
      const tilt = (r() - 0.5) * 0.2
      b.o.box(0.015, 0.55, 0.42, '#F6EFE2', [side * (HW - 0.13), y - 0.3, z], [tilt, 0, 0])
      b.o.cyl(0.08 + r() * 0.06, 0.08, 0.02, PAINTS[Math.floor(r() * 7)], [side * (HW - 0.14), y - 0.25, z + 0.04], [0, 0, Math.PI / 2], 10)
      b.o.box(0.02, 0.06, 0.28, PAINTS[Math.floor(r() * 7)], [side * (HW - 0.14), y - 0.45, z])
      b.o.box(0.03, 0.06, 0.02, PAINTS[Math.floor(r() * 7)], [side * (HW - 0.12), y - 0.01, z])
    }
  }
  // pia de lavar pincéis, baixa
  b.o.box(0.6, 0.85, 2.2, '#C9CED4', [side * (HW - 0.3), 0.425, -8])
  b.o.box(0.5, 0.04, 1.6, '#9AA3AD', [side * (HW - 0.3), 0.87, -8])
  for (let k = 0; k < 6; k++) b.o.sphere(0.06, PAINTS[k], [side * (HW - 0.3) + (r() - 0.5) * 0.3, 0.92, -7.4 - k * 0.22])
  return finish(b)
}

function argila(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(731 + side)
  wall(b, side, 0, -L, W, 0, H)
  for (const zc of [-4, -12]) {
    const x = side * (HW - 0.65)
    b.o.box(1.0, 0.06, 3.0, '#C99A63', [x, 0.78, zc])
    for (const dz of [-1.35, 1.35]) for (const dx of [-0.4, 0.4]) b.o.box(0.06, 0.76, 0.06, '#7A5A3C', [x + dx, 0.38, zc + dz])
    // vasos de argila e esculturas
    for (let k = 0; k < 5; k++) {
      const c = shade('#C9774A', 0.85 + r() * 0.3)
      const h = 0.15 + r() * 0.2
      b.o.cyl(0.06 + r() * 0.06, 0.08 + r() * 0.04, h, c, [x + (r() - 0.5) * 0.6, 0.81 + h / 2, zc - 1.1 + k * 0.55], undefined, 12)
    }
    b.o.sphere(0.12, PAINTS[Math.floor(r() * 7)], [x, 0.95, zc + 1.3])
  }
  // quadros grandes na parede
  for (const z of [-8]) {
    b.o.box(0.06, 1.4, 2.4, '#B07B45', [side * (HW - 0.03), 2.4, z])
    b.o.box(0.07, 1.25, 2.25, '#3F6FB0', [side * (HW - 0.04), 2.4, z])
    b.o.cyl(0.3, 0.3, 0.02, '#F5D547', [side * (HW - 0.08), 2.65, z + 0.6], [0, 0, Math.PI / 2], 20)
    b.o.box(0.02, 0.5, 2.2, '#4FB36B', [side * (HW - 0.08), 1.95, z])
  }
  return finish(b)
}

function paintedFloor() {
  return canvasTexture(512, (g, px) => {
    const r = mulberry32(88)
    // tábuas claras
    const rows = 8
    const h = px / rows
    for (let i = 0; i < rows; i++) {
      const base = 0.92 + r() * 0.1
      g.fillStyle = `rgb(${Math.round(196 * base)},${Math.round(160 * base)},${Math.round(116 * base)})`
      g.fillRect(0, i * h, px, h)
      g.fillStyle = 'rgba(80,55,30,0.45)'
      g.fillRect(0, i * h, px, 2)
    }
    // respingos de tinta
    for (let i = 0; i < 26; i++) {
      g.fillStyle = PAINTS[Math.floor(r() * PAINTS.length)] + 'B0'
      const x = r() * px
      const y = r() * px
      const s = 4 + r() * 14
      g.beginPath()
      g.arc(x, y, s, 0, Math.PI * 2)
      g.fill()
      for (let k = 0; k < 4; k++) {
        g.beginPath()
        g.arc(x + (r() - 0.5) * s * 4, y + (r() - 0.5) * s * 4, s * 0.25, 0, Math.PI * 2)
        g.fill()
      }
    }
    grain(g, px, 0.07, 71)
  })
}

export const artes: ScenarioDef = {
  name: 'Sala de artes',
  outdoor: false,
  atmosphere: {
    skyTop: '#A48DB0',
    horizon: '#B9A0B4',
    fogNear: 26,
    fogFar: 105,
    hemiSky: '#FFF2E2',
    hemiGround: '#D9BFA6',
    hemi: 1.8,
    sun: '#FFE8C8',
    sunIntensity: 1.8,
    sunDir: [-4, 9, 2],
    fill: '#E6D6FF',
    fillIntensity: 0.45,
  },
  floor: paintedFloor,
  floorRoughness: 0.5,
  common,
  sides: [cavaletes, tintas, varal, argila],
  facade: { wall: '#EFDCC0', frame: '#8E7DBE', sign: BRAND.roxo, signText: '#FFFFFF' },
}
