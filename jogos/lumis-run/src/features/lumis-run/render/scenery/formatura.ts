import * as THREE from 'three'
import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, canvasTexture, ceiling, finish, grain, HW, L, mix, shade, wall, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 10: auditório da formatura, com plateia, cortinas, holofotes e balões. */
const W = { wall: '#6E4A3E', lower: '#4F3229', trim: '#C9A050', base: '#2E1D18' }
const SEAT = '#9C2F3C'
const GOLD = '#D9AE4E'
const HIGH = 5.6

function common(): SidePiece {
  const b = builders()
  ceiling(b, '#3F3036', '#2E2328', HIGH)
  for (const side of [-1, 1]) b.o.box(0.3, HIGH - 4.4, L, W.wall, [side * (HW + 0.15), (4.4 + HIGH) / 2, -L / 2])
  // treliça de luzes com holofotes
  for (const z of [-4, -12]) {
    b.o.box(HW * 2, 0.18, 0.18, '#2B2B30', [0, HIGH - 0.6, z])
    for (let i = 0; i < 5; i++) {
      const x = -3.2 + i * 1.6
      b.o.cyl(0.13, 0.18, 0.35, '#2B2B30', [x, HIGH - 0.85, z], [0.5, 0, 0], 12)
      b.e.cyl(0.12, 0.12, 0.02, ['#FFE6A8', '#FFC9E0', '#C9E4FF', '#FFE6A8', '#D8FFC9'][i], [x, HIGH - 1.0, z + 0.09], [0.5, 0, 0], 12)
    }
  }
  // faixa "Parabéns, formandos" com bandeirolas da marca
  for (let i = 0; i < 12; i++) b.o.box(0.6, 0.5, 0.02, Object.values(BRAND)[i % 6], [-HW + 0.6 + i * 0.78, 4.7, -8])
  b.o.box(HW * 2, 0.04, 0.04, GOLD, [0, 4.95, -8])
  // tapete vermelho no centro, com borda dourada
  b.o.box(5.2, 0.012, L, '#8E2534', [0, 0.006, -L / 2])
  for (const x of [-2.6, 2.6]) b.o.box(0.1, 0.016, L, GOLD, [x, 0.008, -L / 2])
  return finish(b, HIGH)
}

function seats(b: B, side: number, z0: number, z1: number) {
  for (let row = 0; row < 4; row++) {
    const x = side * (HW + 0.6 + row * 0.9)
    const y = row * 0.35
    b.o.box(0.9, y + 0.1, z0 - z1, shade('#4F3229', 0.9), [x, (y + 0.1) / 2, (z0 + z1) / 2])
    for (let z = z0 - 0.35; z > z1 + 0.2; z -= 0.6) {
      b.o.box(0.5, 0.12, 0.5, SEAT, [x, y + 0.45, z])
      b.o.box(0.12, 0.6, 0.5, SEAT, [x + side * 0.24, y + 0.75, z])
      b.o.box(0.5, 0.35, 0.06, '#2E1D18', [x, y + 0.28, z + 0.27])
    }
  }
}

function plateia(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(1001 + side)
  // a plateia fica atrás de uma mureta baixa, fora da passagem, até a parede do fundo
  b.o.box(0.3, HIGH, L, W.wall, [side * (HW + 4.0), HIGH / 2, -L / 2])
  b.o.box(4.0, 0.05, L, '#5A2A30', [side * (HW + 2.0), 0.0, -L / 2])
  b.o.box(0.3, 0.5, L, '#4F3229', [side * (HW - 0.15), 0.25, -L / 2])
  b.o.box(0.34, 0.05, L, GOLD, [side * (HW - 0.15), 0.52, -L / 2])
  // parede recuada com as fileiras de cadeiras
  seats(b, side, -0.6, -15.4)
  // formandos de beca (silhuetas) em alguns lugares
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(r() * 4)
    const x = side * (HW + 0.6 + row * 0.9)
    const z = -1 - r() * 13.5
    b.o.cyl(0.18, 0.26, 0.7, '#1F2A44', [x, row * 0.35 + 0.85, z], undefined, 10)
    b.o.sphere(0.14, ['#E6B48A', '#B9825A', '#8A5A3A'][i % 3], [x, row * 0.35 + 1.35, z])
    b.o.box(0.36, 0.04, 0.36, '#1F2A44', [x, row * 0.35 + 1.5, z], [0, 0.6, 0])
  }
  return finish(b, HIGH)
}

function cortinas(side: number): SidePiece {
  const b = builders()
  wall(b, side, 0, -L, W, 0, HIGH)
  // cortina vermelha com dobras
  const x = side * (HW - 0.2)
  for (let z = -0.3; z > -L + 0.2; z -= 0.4) b.o.cyl(0.22, 0.22, HIGH - 0.4, (Math.round(-z / 0.4) % 2 ? SEAT : shade(SEAT, 0.8)), [x, (HIGH - 0.4) / 2, z], undefined, 8)
  b.o.box(0.5, 0.5, L, GOLD, [x, HIGH - 0.4, -L / 2])
  // amarração dourada e caixas de som
  for (const z of [-4, -12]) {
    b.o.add(new THREE.TorusGeometry(0.3, 0.05, 8, 16), GOLD, [x - side * 0.1, 1.4, z], [0, Math.PI / 2, 0])
    b.o.box(0.6, 0.9, 0.6, '#1F1F24', [side * (HW - 0.6), 0.45, z - 2])
    b.o.cyl(0.18, 0.18, 0.02, '#3A3A42', [side * (HW - 0.91), 0.55, z - 2], [0, 0, Math.PI / 2], 16)
  }
  return finish(b, HIGH)
}

function palco(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(1021 + side)
  wall(b, side, 0, -L, W, 0, HIGH)
  // palco lateral com púlpito, diplomas e troféu
  const x = side * (HW - 0.6)
  b.o.box(1.2, 0.45, 9, '#6B3F2C', [x, 0.225, -8])
  b.o.box(1.22, 0.05, 9.02, GOLD, [x, 0.47, -8])
  const px = side * (HW - 0.7)
  b.o.box(0.6, 1.1, 0.8, '#4F3229', [px, 1.0, -8])
  b.o.box(0.62, 0.06, 0.82, GOLD, [px, 1.56, -8])
  b.o.cyl(0.015, 0.015, 0.35, '#2B2B30', [px - side * 0.15, 1.75, -8], [0, 0, side * 0.4], 6)
  // mesa com diplomas enrolados (fitas da marca)
  b.o.box(0.6, 0.05, 2.4, '#E9DCC6', [px, 1.2, -11.5])
  for (const dz of [-1.0, 1.0]) b.o.box(0.05, 0.75, 0.05, '#4F3229', [px, 0.85, -11.5 + dz])
  for (let k = 0; k < 7; k++) {
    b.o.cyl(0.04, 0.04, 0.45, '#F6EFE2', [px, 1.27, -12.4 + k * 0.3], [0, 0, Math.PI / 2], 8)
    b.o.cyl(0.045, 0.045, 0.05, Object.values(BRAND)[k % 6], [px, 1.27, -12.4 + k * 0.3], [0, 0, Math.PI / 2], 8)
  }
  b.o.cyl(0.08, 0.14, 0.12, GOLD, [px, 1.31, -10.5])
  b.o.add(new THREE.CylinderGeometry(0.16, 0.06, 0.26, 16), GOLD, [px, 1.5, -10.5])
  // painel de fundo com estrelas
  for (let i = 0; i < 6; i++) b.o.add(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 5), mix(GOLD, '#FFFFFF', r() * 0.3), [side * (HW - 0.03), 2.4 + r() * 1.6, -4.5 - i * 1.4], [0, 0, Math.PI / 2])
  return finish(b, HIGH)
}

function baloes(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(1031 + side)
  wall(b, side, 0, -L, W, 0, HIGH)
  // arcos de balões nas cores da marca
  for (const zc of [-4, -12]) {
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI
      const z = zc + Math.cos(a) * 2.2
      const y = Math.sin(a) * 3.2
      b.o.sphere(0.24, Object.values(BRAND)[i % 6], [side * (HW - 0.3), y + 0.2, z], [1, 1.15, 1])
      b.o.sphere(0.2, Object.values(BRAND)[(i + 3) % 6], [side * (HW - 0.45), y + 0.35, z + 0.15], [1, 1.15, 1])
    }
  }
  // capelos jogados para o alto (presos no ar) e confetes na parede
  for (let i = 0; i < 6; i++) {
    const z = -1 - r() * 14
    const y = 3.2 + r() * 1.5
    b.o.box(0.4, 0.04, 0.4, '#1F2A44', [side * (HW - 0.8), y, z], [r() * 0.6, r() * 3, r() * 0.6])
    b.o.box(0.04, 0.18, 0.04, GOLD, [side * (HW - 0.8), y - 0.1, z + 0.15])
  }
  for (let i = 0; i < 40; i++) b.o.box(0.02, 0.06, 0.1, Object.values(BRAND)[i % 6], [side * (HW - 0.02), 0.8 + r() * 4.4, -r() * L], [r() * 3, 0, 0])
  return finish(b, HIGH)
}

function stageFloor() {
  return canvasTexture(512, (g, px) => {
    const rows = 8
    const h = px / rows
    const r = mulberry32(111)
    for (let i = 0; i < rows; i++) {
      let x = -r() * px * 0.4
      while (x < px) {
        const w = px * (0.3 + r() * 0.4)
        const k = 0.85 + r() * 0.18
        g.fillStyle = `rgb(${Math.round(110 * k)},${Math.round(66 * k)},${Math.round(44 * k)})`
        g.fillRect(x, i * h, w, h)
        g.fillStyle = 'rgba(30,15,10,0.6)'
        g.fillRect(x, i * h, 2, h)
        x += w
      }
      g.fillStyle = 'rgba(25,12,8,0.6)'
      g.fillRect(0, i * h, px, 2)
    }
    blotches(g, px, 'rgba(255,210,150,0.06)', 8, 33)
    grain(g, px, 0.08, 101)
  })
}

export const formatura: ScenarioDef = {
  name: 'Formatura',
  outdoor: false,
  atmosphere: {
    skyTop: '#2E2228',
    horizon: '#5A3C40',
    fogNear: 24,
    fogFar: 100,
    hemiSky: '#FFE4C8',
    hemiGround: '#A0705E',
    hemi: 1.7,
    sun: '#FFD9A8',
    sunIntensity: 2.3,
    sunDir: [-3, 9, 3],
    fill: '#FFC9E0',
    fillIntensity: 0.55,
  },
  floor: stageFloor,
  floorRoughness: 0.35,
  common,
  sides: [plateia, cortinas, palco, baloes],
  facade: { wall: '#6E4A3E', frame: GOLD, sign: '#1F2A44', signText: GOLD },
}
