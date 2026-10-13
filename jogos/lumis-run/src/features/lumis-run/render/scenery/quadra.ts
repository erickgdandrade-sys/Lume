import * as THREE from 'three'
import { BRAND } from '../../config/palette'
import { mulberry32 } from '../../core/rng'
import { blotches, builders, canvasTexture, finish, grain, HW, L, shade, tree, type B, type SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** Nível 3: quadra de jogos coberta, com arquibancada, cestas e gol. */
const COURT_OUT = '#3D6E8F'
const CONCRETE = '#9EA3A8'
const STEEL = '#5E6B78'
const ROOF_Y = 8.2

function common(): SidePiece {
  const b = builders()
  // linhas da quadra: laterais, linha de meio e círculo central a cada segmento
  for (const side of [-1, 1]) {
    b.o.box(0.1, 0.006, L, '#F1EEE6', [side * (HW - 0.45), 0.004, -L / 2])
    b.o.box(1.6, 0.04, L, COURT_OUT, [side * (HW + 0.8), 0.02, -L / 2])
    b.o.box(5.5, 0.06, L, CONCRETE, [side * (HW + 4.35), 0.03, -L / 2])
    b.o.box(20, 0.05, L, '#6E9F55', [side * (HW + 17), 0.025, -L / 2])
    // pilares e treliça do telhado
    for (const z of [-0.2, -8.2]) {
      b.o.box(0.35, ROOF_Y, 0.35, STEEL, [side * (HW + 5.2), ROOF_Y / 2, z])
      b.o.box(0.5, 0.25, 0.5, shade(STEEL, 0.7), [side * (HW + 5.2), 0.12, z])
    }
  }
  b.o.box(HW * 2 - 0.8, 0.006, 0.1, '#F1EEE6', [0, 0.004, -8])
  b.o.add(new THREE.TorusGeometry(1.8, 0.05, 4, 48), '#F1EEE6', [0, 0.004, -8], [Math.PI / 2, 0, 0], [1, 1, 0.1])
  b.o.cyl(0.35, 0.35, 0.006, '#E9C25A', [0, 0.005, -8], undefined, 24)
  // telhado em arco: vigas a cada 4 m e telhas entre elas
  const span = HW + 5.4
  for (let z = -0.2; z > -L; z -= 4) {
    b.o.box(span * 2, 0.3, 0.25, STEEL, [0, ROOF_Y, z])
    for (let i = -4; i <= 4; i++) b.o.box(0.08, 0.9, 0.08, STEEL, [i * (span / 4.5), ROOF_Y - 0.5, z], [0, 0, i % 2 ? 0.6 : -0.6])
    b.o.box(span * 2, 0.12, 0.15, STEEL, [0, ROOF_Y - 1.0, z])
  }
  for (const side of [-1, 1]) {
    b.o.box(span, 0.12, L, '#7D8995', [side * span * 0.5, ROOF_Y + 0.55 + 0.08, -L / 2], [0, 0, -side * 0.12])
    // telhas translúcidas: luz do dia entrando
    b.e.box(span * 0.6, 0.02, 2.4, '#D9E6EF', [side * span * 0.42, ROOF_Y + 0.42, -6], [0, 0, -side * 0.12])
    b.e.box(span * 0.6, 0.02, 2.4, '#D9E6EF', [side * span * 0.42, ROOF_Y + 0.42, -14], [0, 0, -side * 0.12])
  }
  return finish(b, null)
}

function bleachers(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(301 + side)
  const x0 = HW + 1.8
  for (let s = 0; s < 5; s++) {
    const x = side * (x0 + s * 0.8 + 0.4)
    const h = 0.45 * (s + 1)
    b.o.box(0.8, h, L - 1.2, shade(CONCRETE, 0.95 - s * 0.03), [x, h / 2, -L / 2])
    // cadeiras coloridas
    for (let z = -1.2; z > -L + 1.2; z -= 0.62) {
      const c = Object.values(BRAND)[(s + Math.floor(-z / 0.62)) % 6]
      b.o.box(0.42, 0.06, 0.48, c, [x, h + 0.03, z])
      b.o.box(0.06, 0.38, 0.48, c, [x + side * 0.22, h + 0.22, z])
    }
  }
  // torcedores de papelão (silhuetas coloridas) em alguns lugares
  for (let i = 0; i < 7; i++) {
    const s = Math.floor(r() * 5)
    const x = side * (x0 + s * 0.8 + 0.4)
    const z = -1.5 - r() * (L - 3)
    const c = ['#E07A5F', '#81B29A', '#F2CC8F', '#3D405B', '#8E7DBE'][i % 5]
    b.o.cyl(0.2, 0.24, 0.55, c, [x, 0.45 * (s + 1) + 0.35, z], undefined, 10)
    b.o.sphere(0.15, '#E6B48A', [x, 0.45 * (s + 1) + 0.78, z])
  }
  b.o.box(0.08, 1.0, L - 1.2, STEEL, [side * (x0 + 4.1), 2.25 + 0.5, -L / 2])
  return finish(b, null)
}

function hoop(b: B, side: number, z: number) {
  const x = side * (HW + 1.4)
  b.o.cyl(0.1, 0.12, 3.6, '#3F4A5C', [x, 1.8, z], undefined, 10)
  b.o.box(1.2, 0.12, 0.12, '#3F4A5C', [x - side * 0.6, 3.5, z])
  b.o.box(0.06, 1.05, 1.8, '#F4F1EA', [x - side * 1.2, 3.55, z])
  b.o.box(0.07, 0.45, 0.6, '#D9553A', [x - side * 1.2, 3.35, z])
  b.o.box(0.065, 0.39, 0.54, '#F4F1EA', [x - side * 1.2, 3.35, z])
  b.o.add(new THREE.TorusGeometry(0.24, 0.025, 6, 20), '#E86A2E', [x - side * 1.5, 3.08, z], [Math.PI / 2, 0, 0])
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    b.o.box(0.015, 0.36, 0.015, '#F4F1EA', [x - side * 1.5 + Math.cos(a) * 0.2, 2.9, z + Math.sin(a) * 0.2], [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2])
  }
}

function cestas(side: number): SidePiece {
  const b = builders()
  hoop(b, side, -4)
  hoop(b, side, -12)
  // bolas e carrinho de bolas
  const bx = side * (HW + 3.2)
  b.o.box(1.2, 0.08, 0.7, '#5E6B78', [bx, 0.75, -8])
  for (const dx of [-0.55, 0.55]) for (const dz of [-0.3, 0.3]) b.o.box(0.04, 0.75, 0.04, '#5E6B78', [bx + dx, 0.37, -8 + dz])
  for (let i = 0; i < 6; i++) b.o.sphere(0.13, i % 2 ? '#E86A2E' : '#F2EDE3', [bx - 0.4 + (i % 3) * 0.4, 0.92, -8 + (i < 3 ? -0.15 : 0.15)])
  b.o.sphere(0.13, '#E86A2E', [side * (HW + 1.0), 0.13, -1.6])
  b.o.sphere(0.11, '#F2EDE3', [side * (HW + 1.8), 0.11, -14.2])
  return finish(b, null)
}

function gol(side: number): SidePiece {
  const b = builders()
  // alambrado com postes e tela
  const fx = side * (HW + 2.6)
  for (let z = -0.5; z > -L; z -= 2.5) b.o.cyl(0.04, 0.04, 3.6, STEEL, [fx, 1.8, z], undefined, 6)
  b.o.box(0.05, 0.05, L, STEEL, [fx, 3.6, -L / 2])
  b.o.box(0.05, 0.05, L, STEEL, [fx, 0.05, -L / 2])
  for (let y = 0.3; y < 3.6; y += 0.3) b.o.box(0.015, 0.015, L, '#7F8A96', [fx, y, -L / 2])
  for (let z = -0.25; z > -L; z -= 0.3) b.o.box(0.015, 3.6, 0.015, '#7F8A96', [fx, 1.8, z])
  // gol de futsal encostado
  const gx = side * (HW + 1.6)
  const z0 = -6
  const w = 3
  for (const dz of [0, -w]) b.o.cyl(0.05, 0.05, 2, '#F4F1EA', [gx, 1, z0 + dz], undefined, 8)
  b.o.cyl(0.05, 0.05, w, '#F4F1EA', [gx, 2, z0 - w / 2], [Math.PI / 2, 0, 0], 8)
  for (let i = 0; i <= 8; i++) b.o.box(0.8, 0.012, 0.012, '#E8E4DA', [gx + side * 0.4, 0.2 + i * 0.22, z0 - w / 2], [0, 0, side * 0.5])
  b.o.sphere(0.13, '#F2EDE3', [side * (HW + 0.9), 0.13, -10.5])
  // bebedouro
  b.o.box(0.5, 1.0, 0.5, '#BFC6CF', [side * (HW + 2.2), 0.5, -13.5])
  b.o.box(0.42, 0.06, 0.42, '#8E98A5', [side * (HW + 2.2), 1.03, -13.5])
  return finish(b, null)
}

function placar(side: number): SidePiece {
  const b = builders()
  const x = side * (HW + 4.4)
  for (const dz of [-1.6, 1.6]) b.o.box(0.2, 5.2, 0.2, STEEL, [x, 2.6, -8 + dz])
  b.o.box(0.35, 1.8, 4.4, '#2B3440', [x, 5.0, -8])
  const fx = x - side * 0.19
  // números do placar (painéis luminosos)
  for (const [dz, c] of [[-1.2, '#FFB648'], [1.2, '#FF6B6B']] as const) {
    b.e.box(0.02, 0.8, 1.0, c, [fx, 5.15, -8 + dz])
    b.o.box(0.03, 0.12, 0.9, '#2B3440', [fx - side * 0.005, 5.15, -8 + dz])
  }
  b.e.box(0.02, 0.22, 2.6, '#7FD1FF', [fx, 4.35, -8])
  b.o.box(0.04, 0.3, 4.4, BRAND.azul, [fx, 5.75, -8])
  tree(b, side * (HW + 8), -3, 1.1, '#4C9A5B', '#7A5236', mulberry32(9))
  tree(b, side * (HW + 9), -13, 1.0, '#5FA855', '#7A5236', mulberry32(10))
  return finish(b, null)
}

function court() {
  return canvasTexture(512, (g, px) => {
    g.fillStyle = '#3F8C83'
    g.fillRect(0, 0, px, px)
    blotches(g, px, 'rgba(255,255,255,0.05)', 10, 2)
    blotches(g, px, 'rgba(10,40,40,0.08)', 8, 4)
    grain(g, px, 0.05, 31)
    // reflexo suave de verniz em faixas
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(255,255,255,0.025)'
      g.fillRect(0, (i * px) / 6, px, px / 24)
    }
  })
}

export const quadra: ScenarioDef = {
  name: 'Quadra de jogos',
  outdoor: true,
  atmosphere: {
    skyTop: '#6E9FCF',
    horizon: '#9FB6C6',
    fogNear: 30,
    fogFar: 120,
    hemiSky: '#E1EBF5',
    hemiGround: '#6F8C88',
    hemi: 1.6,
    sun: '#FFF1D8',
    sunIntensity: 1.6,
    sunDir: [-5, 10, 3],
    fill: '#D6E4FF',
    fillIntensity: 0.4,
  },
  floor: court,
  floorRoughness: 0.35,
  common,
  sides: [bleachers, cestas, gol, placar],
  facade: { wall: '#B9C3CC', frame: '#E86A2E', sign: '#3F8C83', signText: '#FFFFFF' },
}
