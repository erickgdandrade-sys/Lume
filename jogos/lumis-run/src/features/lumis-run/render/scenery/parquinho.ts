import * as THREE from 'three'
import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, bush, canvasTexture, finish, grain, HW, L, shade, tree, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 9: parquinho, ao ar livre, com escorregador, balanços e gangorra. */
const SAND = '#D9BE86'
const GRASS = '#6AA455'
const METAL = '#4F7FB0'

function common(): SidePiece {
  const b = builders()
  for (const side of [-1, 1]) {
    // borda emborrachada, areia e gramado
    b.o.box(0.3, 0.25, L, '#3F86D9', [side * (HW + 0.15), 0.125, -L / 2])
    b.o.box(5.5, 0.08, L, SAND, [side * (HW + 0.3 + 2.75), 0.04, -L / 2])
    b.o.box(26, 0.1, L, GRASS, [side * (HW + 5.8 + 13), 0.05, -L / 2])
  }
  return finish(b, null)
}

function escorregador(side: number): SidePiece {
  const b = builders()
  const x = side * (HW + 2.6)
  const z = -8
  // torre com telhadinho, escada e rampa
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) b.o.box(0.1, 3.2, 0.1, METAL, [x + dx, 1.6, z + dz])
  b.o.box(1.3, 0.1, 1.3, '#E2B53E', [x, 1.8, z])
  b.o.add(new THREE.ConeGeometry(1.05, 0.8, 4), '#E2433A', [x, 3.6, z], [0, Math.PI / 4, 0])
  for (let y = 0.3; y < 1.8; y += 0.3) b.o.box(0.6, 0.05, 0.08, '#E8ECEF', [x, y, z + 0.9 + (1.8 - y) * 0.25])
  for (const dx of [-0.32, 0.32]) b.o.box(0.06, 2.1, 0.06, '#E8ECEF', [x + dx, 0.95, z + 1.15], [0.24, 0, 0])
  const ramp = new THREE.BoxGeometry(1, 1, 1)
  b.o.add(ramp, '#E8812F', [x, 1.0, z - 1.95], [-0.62, 0, 0], [0.7, 0.06, 3.0])
  for (const dx of [-0.36, 0.36]) b.o.add(ramp, shade('#E8812F', 0.8), [x + dx, 1.12, z - 1.95], [-0.62, 0, 0], [0.06, 0.22, 3.0])
  for (const dx of [-0.65, 0.65]) b.o.box(0.05, 0.6, 1.3, METAL, [x + dx, 2.1, z])
  tree(b, side * (HW + 6.5), -2, 1.1, '#4C9A5B', '#7A5236', mulberry32(901 + side))
  return finish(b, null)
}

function swing(b: B, x: number, z: number, seatColors: string[]) {
  const h = 2.6
  const w = 3.2
  for (const dz of [-w / 2, w / 2]) {
    b.o.box(0.08, h + 0.2, 0.08, METAL, [x - 0.5, h / 2, z + dz], [0, 0, -0.2])
    b.o.box(0.08, h + 0.2, 0.08, METAL, [x + 0.5, h / 2, z + dz], [0, 0, 0.2])
  }
  b.o.cyl(0.06, 0.06, w, METAL, [x, h, z], [Math.PI / 2, 0, 0], 8)
  seatColors.forEach((c, i) => {
    const sz = z - w / 2 + (i + 0.5) * (w / seatColors.length)
    for (const dz of [-0.2, 0.2]) b.o.box(0.015, 2.0, 0.015, '#A9B3BD', [x, h - 1.0, sz + dz])
    b.o.box(0.4, 0.05, 0.5, c, [x, 0.6, sz])
  })
}

function balanco(side: number): SidePiece {
  const b = builders()
  swing(b, side * (HW + 2.6), -4.5, [BRAND.rosa, BRAND.azul])
  swing(b, side * (HW + 2.6), -11.5, [BRAND.verde, BRAND.amarelo])
  bush(b, side * (HW + 6.2), -8, 1.2)
  return finish(b, null)
}

function gangorra(side: number): SidePiece {
  const b = builders()
  const x = side * (HW + 2.2)
  // gangorra
  b.o.box(0.3, 0.5, 0.3, METAL, [x, 0.25, -4])
  b.o.box(0.32, 0.08, 3.6, '#E2433A', [x, 0.62, -4], [0.18, 0, 0])
  for (const dz of [-1.5, 1.5]) b.o.box(0.08, 0.3, 0.08, '#E8ECEF', [x, 0.62 + dz * 0.18 + 0.2, -4 + dz * 0.98])
  // carrossel colorido
  const cx = side * (HW + 3.0)
  b.o.cyl(1.3, 1.3, 0.12, '#E8ECEF', [cx, 0.35, -11], undefined, 24)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    b.o.add(new THREE.CylinderGeometry(1.25, 1.25, 0.13, 4, 1, false, a, Math.PI / 3), Object.values(BRAND)[i], [cx, 0.36, -11])
    b.o.box(0.04, 0.6, 0.04, METAL, [cx + Math.cos(a) * 1.0, 0.7, -11 + Math.sin(a) * 1.0])
  }
  b.o.cyl(0.06, 0.06, 1.2, METAL, [cx, 0.9, -11], undefined, 8)
  b.o.add(new THREE.TorusGeometry(0.9, 0.035, 6, 24), METAL, [cx, 1.0, -11], [Math.PI / 2, 0, 0])
  // baldinho e pá na areia
  b.o.cyl(0.14, 0.11, 0.22, '#E2B53E', [side * (HW + 0.9), 0.19, -7.5], undefined, 10)
  b.o.box(0.08, 0.02, 0.35, '#3F86D9', [side * (HW + 1.1), 0.1, -7.1], [0, 0.6, 0])
  return finish(b, null)
}

function trepaTrepa(side: number): SidePiece {
  const b = builders()
  const x = side * (HW + 2.4)
  const z = -5
  const n = 4
  const s = 0.7
  // trepa-trepa em cubos de tubos
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= 2; j++) b.o.cyl(0.035, 0.035, 2.1, METAL, [x - s + j * s, 1.05, z - i * s], undefined, 6)
    for (const y of [0.7, 1.4, 2.1]) b.o.cyl(0.03, 0.03, 2 * s, ['#E2433A', '#E2B53E', '#4FB36B'][Math.round(y / 0.7) - 1], [x, y, z - i * s], [0, 0, Math.PI / 2], 6)
  }
  for (const y of [0.7, 1.4, 2.1]) for (let j = 0; j <= 2; j++) b.o.cyl(0.03, 0.03, n * s, METAL, [x - s + j * s, y, z - (n * s) / 2], [Math.PI / 2, 0, 0], 6)
  // casinha de brincar
  const hx = side * (HW + 2.6)
  const hz = -12.5
  b.o.box(1.8, 1.6, 2.0, '#F2D49B', [hx, 0.8, hz])
  b.o.add(new THREE.CylinderGeometry(1, 1, 1, 3), '#C2408A', [hx, 1.95, hz], [Math.PI / 2, 0, Math.PI / 2], [1.15, 2.2, 0.8])
  b.o.box(0.05, 1.0, 0.6, '#7A5A3C', [hx - side * 0.91, 0.5, hz])
  b.o.box(0.05, 0.5, 0.5, '#9CC2E2', [hx - side * 0.91, 1.1, hz + 0.65])
  tree(b, side * (HW + 6.8), -9, 1.2, '#5FA855', '#7A5236', mulberry32(931 + side))
  return finish(b, null)
}

function rubber() {
  return canvasTexture(512, (g, px) => {
    const n = 4
    const t = px / n
    const cols = ['#C8573F', '#D2694B', '#3F7FB8', '#C8573F']
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = cols[(i * 3 + j * 2) % 4]
      if ((i + j) % 5 === 3) g.fillStyle = '#4E9B58'
      g.fillRect(i * t, j * t, t, t)
    }
    blotches(g, px, 'rgba(0,0,0,0.08)', 10, 31)
    grain(g, px, 0.18, 91)
    g.strokeStyle = 'rgba(40,20,15,0.45)'
    g.lineWidth = 3
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, px); g.stroke()
      g.beginPath(); g.moveTo(0, i * t); g.lineTo(px, i * t); g.stroke()
    }
  })
}

export const parquinho: ScenarioDef = {
  name: 'Parquinho',
  outdoor: true,
  atmosphere: {
    skyTop: '#5A97D6',
    horizon: '#B6C9D9',
    fogNear: 34,
    fogFar: 125,
    hemiSky: '#DDEBFF',
    hemiGround: '#A39468',
    hemi: 1.5,
    sun: '#FFE4BA',
    sunIntensity: 2.5,
    sunDir: [-6, 9, 5],
    fill: '#D2E6FF',
    fillIntensity: 0.35,
  },
  floor: rubber,
  floorRoughness: 0.9,
  common,
  sides: [escorregador, balanco, gangorra, trepaTrepa],
  facade: { wall: '#F2D49B', frame: '#E2433A', sign: '#3F86D9', signText: '#FFFFFF' },
}
