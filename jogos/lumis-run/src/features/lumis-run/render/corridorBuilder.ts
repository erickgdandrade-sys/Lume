import * as THREE from 'three'
import { CORRIDOR } from '../config/gameConfig'
import { BRAND, PASTEL, SCENE_COLORS as C } from '../config/palette'
import { mulberry32 } from '../core/rng'
import { GeoBuilder } from './geoBuilder'

/**
 * Corredor escolar procedural. Cada segmento (16 m) tem uma parte comum
 * (teto, luzes, faixa colorida, bandeirinhas, divisões de faixa) e, de cada
 * lado, uma variação: armários, sala de aula com janela, porta com mural ou
 * estante de livros. Tudo é gerado uma vez, com semente fixa, e reutilizado.
 */
export type SidePiece = { opaque: THREE.BufferGeometry; emissive: THREE.BufferGeometry; glass: THREE.BufferGeometry }
// a ordem precisa bater com core/segments.ts (variantFor)
export const SIDE_VARIANTS = ['armarios', 'sala', 'porta', 'estante'] as const
export type SideVariant = (typeof SIDE_VARIANTS)[number]

const L = CORRIDOR.segmentLength
const HW = CORRIDOR.width / 2
const H = CORRIDOR.height
const WALL_T = 0.3
const WAINSCOT = 1.05
const UPPER = 2.9 // acima disso a parede é comum a todos os segmentos

const PASTELS = Object.values(PASTEL)
const BRANDS = Object.values(BRAND).slice(0, 6)
const shade = (c: string, k: number) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString()

type B = { o: GeoBuilder; e: GeoBuilder; g: GeoBuilder }
const builders = (): B => ({ o: new GeoBuilder(), e: new GeoBuilder(), g: new GeoBuilder() })
const finish = (b: B): SidePiece => ({ opaque: b.o.build(), emissive: b.e.build(), glass: b.g.build() })

/** parede lisa entre z0 e z1 (z0 > z1), do chão até UPPER */
function wall(b: B, side: number, z0: number, z1: number, y0 = 0, y1 = UPPER) {
  const len = z0 - z1
  const zc = (z0 + z1) / 2
  const x = side * (HW + WALL_T / 2)
  if (y0 < WAINSCOT) {
    const top = Math.min(WAINSCOT, y1)
    b.o.box(WALL_T, top - y0, len, C.wallTrim, [x, (y0 + top) / 2, zc])
  }
  if (y1 > WAINSCOT) {
    const bot = Math.max(WAINSCOT, y0)
    b.o.box(WALL_T, y1 - bot, len, C.wall, [x, (bot + y1) / 2, zc])
  }
  if (y0 === 0) b.o.box(0.06, 0.14, len, C.baseboard, [side * (HW - 0.03), 0.07, zc])
  if (y0 <= WAINSCOT && y1 >= WAINSCOT) b.o.box(0.05, 0.06, len, '#FFFFFF', [side * (HW - 0.025), WAINSCOT, zc])
}

// ---------------------------------------------------------------- comum
export function buildCommon(): SidePiece {
  const b = builders()
  // teto e parede superior
  b.o.box(CORRIDOR.width + 2 * WALL_T, 0.2, L, C.ceiling, [0, H + 0.1, -L / 2])
  for (const side of [-1, 1]) {
    const x = side * (HW + WALL_T / 2)
    b.o.box(WALL_T, H - UPPER, L, C.wall, [x, (UPPER + H) / 2, -L / 2])
    // faixa com as seis cores da marca
    const n = 6
    for (let i = 0; i < n; i++) {
      b.o.box(0.04, 0.12, L / n, BRANDS[i], [side * (HW - 0.02), UPPER + 0.14, -(i + 0.5) * (L / n)])
    }
    // sanca entre parede e teto
    b.o.box(0.18, 0.12, L, C.wallTrim, [side * (HW - 0.09), H - 0.06, -L / 2])
  }
  // luminárias
  for (const z of [-4, -12]) {
    for (const x of [-2.2, 2.2]) {
      b.o.box(1.9, 0.05, 0.9, '#E2E8F0', [x, H - 0.02, z])
      b.e.box(1.7, 0.03, 0.7, C.lightPanel, [x, H - 0.05, z])
    }
  }
  // bandeirinhas atravessando o corredor
  const zb = -8
  b.o.cyl(0.012, 0.012, CORRIDOR.width, '#94A3B8', [0, 4.2, zb], [0, 0, Math.PI / 2], 6)
  const flags = 11
  for (let i = 0; i < flags; i++) {
    const x = -HW + 0.45 + (i * (CORRIDOR.width - 0.9)) / (flags - 1)
    const sag = 0.18 * (1 - Math.pow((2 * i) / (flags - 1) - 1, 2))
    b.o.add(new THREE.ConeGeometry(0.16, 0.32, 3), BRANDS[i % 6], [x, 4.2 - 0.17 - sag * 0.6, zb], [Math.PI, Math.PI / 6, 0], [1, 1, 0.25])
  }
  // marcas discretas entre as faixas
  for (const x of [-1.1, 1.1]) {
    for (let z = 0.5; z < L; z += 2) b.o.box(0.07, 0.006, 0.9, '#D8CFC0', [x, 0.003, -z])
  }
  return finish(b)
}

// ------------------------------------------------------------- armários
function lockers(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(11 + side)
  wall(b, side, 0, -L)
  const depth = 0.48
  const xFace = side * (HW - depth)
  const w = 0.6
  const start = -0.9
  const count = 24
  let color = PASTELS[0]
  for (let i = 0; i < count; i++) {
    if (i % 4 === 0) color = PASTELS[Math.floor(r() * PASTELS.length)]
    const z = start - i * w - w / 2
    const h = 1.95
    b.o.box(depth, h, w - 0.03, color, [side * (HW - depth / 2), 0.08 + h / 2, z])
    const dark = shade(color, 0.72)
    for (let s = 0; s < 3; s++) b.o.box(0.012, 0.025, w * 0.55, dark, [xFace - side * 0.006, 1.72 - s * 0.06, z])
    b.o.box(0.03, 0.12, 0.035, '#64748B', [xFace - side * 0.015, 1.1, z + w * 0.3])
    b.o.box(0.012, 0.09, 0.14, '#FFFFFF', [xFace - side * 0.006, 1.42, z])
  }
  // base e topo
  b.o.box(depth, 0.08, count * w, shade(C.baseboard, 0.9), [side * (HW - depth / 2), 0.04, start - (count * w) / 2])
  // objetos sobre os armários
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
      b.o.cyl(0.04, 0.06, 0.12, '#94A3B8', [x, 2.09, z])
      b.o.sphere(0.2, BRAND.azul, [x, 2.34, z])
      b.o.sphere(0.12, BRAND.verde, [x + 0.08, 2.4, z + 0.06], [1, 0.7, 1])
    } else {
      for (let k = 0; k < 3; k++) b.o.box(0.24, 0.24, 0.24, BRANDS[(k + i) % 6], [x, 2.15 + (k === 2 ? 0.24 : 0), z - 0.27 * (k === 2 ? 0.5 : k)])
    }
  }
  return finish(b)
}

// ---------------------------------------------------------- sala de aula
function classroom(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(23 + side)
  const z0 = -2.6
  const z1 = -13.4
  const y0 = 0.95
  const y1 = 2.6
  wall(b, side, 0, z0)
  wall(b, side, z1, -L)
  wall(b, side, z0, z1, 0, y0)
  wall(b, side, z0, z1, y1, UPPER)
  // moldura e esquadrias
  const xf = side * (HW - 0.02)
  b.o.box(0.12, 0.08, z0 - z1 + 0.16, '#FFFFFF', [xf, y0, (z0 + z1) / 2])
  b.o.box(0.12, 0.08, z0 - z1 + 0.16, '#FFFFFF', [xf, y1, (z0 + z1) / 2])
  for (let i = 0; i <= 4; i++) {
    const z = z0 - (i * (z0 - z1)) / 4
    b.o.box(0.12, y1 - y0, 0.08, '#FFFFFF', [xf, (y0 + y1) / 2, z])
  }
  b.g.box(0.02, y1 - y0, z0 - z1, C.glass, [side * (HW + 0.05), (y0 + y1) / 2, (z0 + z1) / 2])
  // a sala
  const rx0 = HW + WALL_T
  const depth = 6.2
  const rxc = side * (rx0 + depth / 2)
  const rz0 = -0.6
  const rz1 = -15.4
  const rzc = (rz0 + rz1) / 2
  const rlen = rz0 - rz1
  b.o.box(depth, 0.05, rlen, C.classroomFloor, [rxc, -0.02, rzc])
  b.o.box(depth, 0.1, rlen, C.ceiling, [rxc, 3.3, rzc])
  b.o.box(0.2, 3.3, rlen, C.classroomWall, [side * (rx0 + depth), 1.65, rzc])
  b.o.box(depth, 3.3, 0.2, C.classroomWall, [rxc, 1.65, rz0])
  b.o.box(depth, 3.3, 0.2, C.classroomWall, [rxc, 1.65, rz1])
  // lousa e alfabeto colorido
  const xb = side * (rx0 + depth - 0.12)
  b.o.box(0.06, 1.25, 5.4, '#8B6B4A', [xb, 1.65, -8])
  b.o.box(0.08, 1.12, 5.25, C.board, [xb - side * 0.01, 1.65, -8])
  for (let i = 0; i < 4; i++) b.o.box(0.09, 0.025, 0.5 + r() * 1.2, '#E8F5E9', [xb - side * 0.02, 1.95 - i * 0.18, -6.5 - r() * 2.5])
  for (let i = 0; i < 12; i++) b.o.box(0.05, 0.3, 0.3, BRANDS[i % 6], [xb, 2.6, -5.0 - i * 0.55])
  // janela com luz do dia na parede do fundo (lateral)
  b.e.box(0.04, 1.4, 2.6, '#FFF7E0', [side * (rx0 + depth - 0.1), 1.7, -2.4])
  b.e.box(0.04, 1.4, 2.6, '#FFF7E0', [side * (rx0 + depth - 0.1), 1.7, -13.6])
  // luminárias da sala
  for (const z of [-4.5, -11.5]) b.e.box(1.4, 0.03, 0.6, C.lightPanel, [rxc, 3.24, z])
  // carteiras
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = side * (rx0 + 1.0 + row * 1.6)
      const z = -3.6 - col * 2.4
      const chair = PASTELS[(row * 4 + col) % 6]
      b.o.box(0.62, 0.05, 0.9, C.desk, [x, 0.74, z])
      for (const dx of [-0.26, 0.26]) for (const dz of [-0.4, 0.4]) b.o.box(0.035, 0.72, 0.035, C.deskLeg, [x + dx, 0.36, z + dz])
      b.o.box(0.42, 0.04, 0.42, chair, [x - side * 0.5, 0.45, z])
      b.o.box(0.04, 0.4, 0.42, chair, [x - side * 0.72, 0.68, z])
      for (const dz of [-0.18, 0.18]) b.o.box(0.03, 0.45, 0.03, C.deskLeg, [x - side * 0.5, 0.22, z + dz])
      if (r() < 0.6) b.o.box(0.22, 0.04, 0.3, BRANDS[Math.floor(r() * 6)], [x, 0.785, z + (r() - 0.5) * 0.4], [0, r() * 0.6, 0])
    }
  }
  // mesa da professora e globo
  const xt = side * (rx0 + depth - 1.3)
  b.o.box(0.8, 0.75, 1.6, shade(C.desk, 0.85), [xt, 0.375, -11.5])
  b.o.cyl(0.03, 0.08, 0.14, '#64748B', [xt, 0.82, -11.1])
  b.o.sphere(0.17, BRAND.azul, [xt, 1.05, -11.1])
  b.o.sphere(0.1, BRAND.verde, [xt + 0.06, 1.1, -11.04], [1, 0.8, 1])
  // planta
  b.o.cyl(0.18, 0.14, 0.4, BRAND.laranja, [side * (rx0 + depth - 0.4), 0.2, -14.6])
  b.o.sphere(0.32, '#4ADE80', [side * (rx0 + depth - 0.4), 0.65, -14.6])
  return finish(b)
}

// ------------------------------------------------------- porta e mural
function doorBoard(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(37 + side)
  wall(b, side, 0, -L)
  const xf = side * (HW - 0.03)
  for (const [zc, frame] of [[-3.2, BRAND.azul], [-13.6, BRAND.roxo]] as const) {
    b.o.box(0.08, 2.45, 1.5, frame, [xf, 1.225, zc])
    b.o.box(0.1, 2.25, 1.25, C.doorWood, [xf - side * 0.02, 1.13, zc])
    b.o.box(0.11, 0.55, 0.42, '#1E3A8A', [xf - side * 0.025, 1.65, zc])
    b.o.box(0.14, 0.05, 0.16, '#475569', [xf - side * 0.05, 1.05, zc + 0.45])
    // placa da sala
    b.o.box(0.05, 0.22, 0.6, '#FFFFFF', [xf - side * 0.01, 2.62, zc])
    b.o.box(0.06, 0.08, 0.36, frame, [xf - side * 0.015, 2.62, zc])
  }
  // mural de cortiça
  const z0 = -5.4
  const z1 = -11.4
  const zc = (z0 + z1) / 2
  b.o.box(0.06, 1.35, z0 - z1 + 0.14, '#FFFFFF', [xf, 1.85, zc])
  b.o.box(0.07, 1.22, z0 - z1, C.cork, [xf - side * 0.005, 1.85, zc])
  for (let i = 0; i < 14; i++) {
    const w = 0.35 + r() * 0.35
    const h = 0.25 + r() * 0.3
    const z = z0 - 0.4 - r() * (z0 - z1 - 0.8)
    const y = 1.4 + r() * 0.9
    b.o.box(0.075, h, w, PASTELS[Math.floor(r() * 6)], [xf - side * 0.01, y, z], [(r() - 0.5) * 0.25, 0, 0])
    b.o.sphere(0.025, BRAND.rosa, [xf - side * 0.05, y + h / 2 - 0.05, z])
  }
  // estrelas de papel no mural
  for (let i = 0; i < 4; i++) {
    b.o.add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 5), BRAND.amarelo, [xf - side * 0.05, 2.35 - r() * 0.2, z0 - 0.6 - i * 1.6], [0, 0, Math.PI / 2])
  }
  // relógio
  b.o.cyl(0.26, 0.26, 0.06, '#FFFFFF', [xf - side * 0.02, 2.6, -8.4], [0, 0, Math.PI / 2], 24)
  b.o.cyl(0.21, 0.21, 0.07, '#F8FAFC', [xf - side * 0.03, 2.6, -8.4], [0, 0, Math.PI / 2], 24)
  b.o.box(0.08, 0.14, 0.02, '#0F172A', [xf - side * 0.07, 2.65, -8.4])
  b.o.box(0.08, 0.02, 0.11, '#0F172A', [xf - side * 0.07, 2.6, -8.45])
  // banco e lixeira de reciclagem
  b.o.box(0.45, 0.06, 2.2, C.doorWood, [side * (HW - 0.35), 0.46, -8.4])
  for (const dz of [-0.9, 0.9]) b.o.box(0.4, 0.44, 0.06, '#64748B', [side * (HW - 0.35), 0.22, -8.4 + dz])
  for (const [k, col] of [BRAND.azul, BRAND.verde, BRAND.amarelo].entries()) b.o.cyl(0.18, 0.16, 0.6, col, [side * (HW - 0.28), 0.3, -1.0 + -0.42 * k], undefined, 14)
  return finish(b)
}

// ------------------------------------------------------- estante de livros
function bookshelf(side: number): SidePiece {
  const b = builders()
  const r = mulberry32(53 + side)
  wall(b, side, 0, -L)
  const depth = 0.42
  const xc = side * (HW - depth / 2)
  const z0 = -1.6
  const z1 = -14.4
  const len = z0 - z1
  const zc = (z0 + z1) / 2
  const wood = '#C98F57'
  b.o.box(depth, 2.3, 0.06, wood, [xc, 1.15, z0])
  b.o.box(depth, 2.3, 0.06, wood, [xc, 1.15, z1])
  b.o.box(0.04, 2.3, len, shade(wood, 0.8), [side * (HW - 0.02), 1.15, zc])
  const shelves = [0.06, 0.6, 1.14, 1.68, 2.24]
  for (const y of shelves) b.o.box(depth, 0.05, len, wood, [xc, y, zc])
  for (let s = 0; s < shelves.length - 1; s++) {
    let z = z0 - 0.08
    while (z > z1 + 0.1) {
      const t = 0.04 + r() * 0.05
      if (r() < 0.06) {
        z -= 0.25
        continue
      }
      const h = 0.3 + r() * 0.16
      const lean = r() < 0.05 ? 0.25 : 0
      b.o.box(depth * 0.82, h, t, BRANDS[Math.floor(r() * 6)], [xc, shelves[s] + 0.025 + h / 2, z - t / 2], [lean, 0, 0])
      z -= t + 0.004
    }
  }
  // vasos e troféu em cima
  for (const z of [-3, -8, -12.5]) {
    b.o.cyl(0.14, 0.11, 0.26, BRAND.rosa, [xc, 2.4, z])
    b.o.sphere(0.24, '#34D399', [xc, 2.66, z], [1, 0.8, 1])
  }
  b.o.cyl(0.05, 0.12, 0.08, '#94A3B8', [xc, 2.31, -5.5])
  b.o.add(new THREE.CylinderGeometry(0.12, 0.05, 0.2, 16), BRAND.amarelo, [xc, 2.45, -5.5])
  return finish(b)
}

const BUILDERS: Record<SideVariant, (side: number) => SidePiece> = {
  armarios: lockers,
  sala: classroom,
  porta: doorBoard,
  estante: bookshelf,
}

export function buildSide(variant: SideVariant, side: -1 | 1) {
  return BUILDERS[variant](side)
}

/** Textura do piso: ladrilhos claros com rejunte e alguns ladrilhos coloridos. */
export function floorTexture() {
  const px = 512
  const tiles = 4
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')!
  const t = px / tiles
  const accents = [PASTEL.azul, PASTEL.amarelo, PASTEL.verde, PASTEL.rosa]
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      g.fillStyle = (i + j) % 2 ? C.floorA : C.floorB
      if (i === 1 && j === 2) g.fillStyle = accents[0]
      if (i === 3 && j === 0) g.fillStyle = accents[1]
      g.fillRect(i * t, j * t, t, t)
    }
  }
  g.strokeStyle = 'rgba(148,163,184,0.35)'
  g.lineWidth = 3
  for (let i = 0; i <= tiles; i++) {
    g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, px); g.stroke()
    g.beginPath(); g.moveTo(0, i * t); g.lineTo(px, i * t); g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}
