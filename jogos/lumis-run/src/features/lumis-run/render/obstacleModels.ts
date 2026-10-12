import * as THREE from 'three'
import { BRAND } from '../config/palette'
import type { ObstacleKind } from '../core/obstacles'
import { mulberry32 } from '../core/rng'
import { GeoBuilder } from './geoBuilder'

/**
 * Modelos procedurais dos obstáculos, com origem no chão, no centro da faixa.
 * Cores fortes da marca para se destacarem do cenário em tons pastel.
 */
const B = BRAND
const BOOK_COLORS = [B.azul, B.rosa, B.amarelo, B.verde, B.roxo, B.laranja]

function books(): THREE.BufferGeometry {
  const g = new GeoBuilder()
  const r = mulberry32(5)
  let y = 0
  for (let i = 0; i < 5; i++) {
    const h = 0.15 + r() * 0.03
    const w = 1.35 - i * 0.06 + r() * 0.08
    const d = 0.62 + r() * 0.06
    const rot = (r() - 0.5) * 0.35
    const off = (r() - 0.5) * 0.12
    g.box(w, h, d, BOOK_COLORS[(i * 2 + 1) % 6], [off, y + h / 2, 0], [0, rot, 0])
    g.box(w - 0.06, h - 0.04, d + 0.012, '#FFFDF5', [off + 0.02, y + h / 2, 0], [0, rot, 0])
    y += h
  }
  return g.build()
}

function desk(): THREE.BufferGeometry {
  const g = new GeoBuilder()
  g.box(1.6, 0.08, 0.8, '#E8B66B', [0, 0.96, 0])
  g.box(1.5, 0.55, 0.05, B.azul, [0, 0.62, 0.32]) // painel frontal
  for (const x of [-0.72, 0.72]) for (const z of [-0.34, 0.34]) g.box(0.06, 0.92, 0.06, '#475569', [x, 0.46, z])
  g.box(0.42, 0.06, 0.3, B.rosa, [-0.3, 1.03, 0], [0, 0.3, 0])
  g.box(0.1, 0.02, 0.02, B.amarelo, [0.3, 1.01, 0.05], [0, -0.4, 0])
  g.cyl(0.012, 0.012, 0.32, B.amarelo, [0.35, 1.015, 0], [0, 0.5, Math.PI / 2], 6)
  return g.build()
}

function boxes(): THREE.BufferGeometry {
  const g = new GeoBuilder()
  const card = '#D9A066'
  g.box(1.5, 1.0, 0.9, card, [0, 0.5, 0])
  g.box(1.3, 0.95, 0.85, '#E3AE75', [0.05, 1.475, 0], [0, 0.12, 0])
  for (const [y, rot] of [[0.5, 0], [1.475, 0.12]] as const) {
    g.box(0.18, 1.0, 0.92, B.azul, [0, y, 0], [0, rot, 0])
    g.box(0.5, 0.28, 0.02, '#FFFFFF', [-0.42, y + 0.1, 0.46], [0, rot, 0])
  }
  return g.build()
}

function cart(): THREE.BufferGeometry {
  const g = new GeoBuilder()
  const r = mulberry32(9)
  const frame = B.verde
  for (const x of [-0.7, 0.7]) g.box(0.06, 1.55, 0.95, frame, [x, 0.9, 0])
  for (const y of [0.3, 0.85, 1.4]) g.box(1.46, 0.05, 0.95, frame, [0, y, 0])
  for (const x of [-0.6, 0.6]) for (const z of [-0.38, 0.38]) g.cyl(0.08, 0.08, 0.06, '#334155', [x, 0.09, z], [0, 0, Math.PI / 2], 12)
  for (const y of [0.33, 0.88]) {
    let x = -0.66
    while (x < 0.64) {
      const t = 0.07 + r() * 0.05
      const h = 0.32 + r() * 0.14
      g.box(t, h, 0.7, BOOK_COLORS[Math.floor(r() * 6)], [x + t / 2, y + h / 2, 0])
      x += t + 0.01
    }
  }
  g.box(0.5, 0.06, 0.06, '#475569', [0, 1.65, -0.44])
  return g.build()
}

function barrier(): THREE.BufferGeometry {
  // barreira baixa de espuma colorida, de parede a parede
  const g = new GeoBuilder()
  const n = 8
  const w = 6.8 / n
  for (let i = 0; i < n; i++) {
    g.box(w - 0.04, 0.5, 0.32, BOOK_COLORS[i % 6], [-3.4 + w / 2 + i * w, 0.25, 0])
    g.box(w - 0.1, 0.06, 0.34, '#FFFFFF', [-3.4 + w / 2 + i * w, 0.4, 0])
  }
  return g.build()
}

function banner(): THREE.BufferGeometry {
  // faixa suspensa "Bem-vindos": obriga a deslizar por baixo
  const g = new GeoBuilder()
  const n = 6
  const w = 6.8 / n
  for (let i = 0; i < n; i++) g.box(w, 0.9, 0.12, BOOK_COLORS[i], [-3.4 + w / 2 + i * w, 1.5, 0])
  g.box(6.9, 0.08, 0.16, '#FFFFFF', [0, 1.98, 0])
  g.box(6.9, 0.08, 0.16, '#FFFFFF', [0, 1.02, 0])
  // "letras" brancas
  for (let i = 0; i < 9; i++) g.box(0.32, 0.36, 0.14, '#FFFFFF', [-2.7 + i * 0.68, 1.5, 0])
  for (const x of [-3.2, 3.2]) g.cyl(0.02, 0.02, 2.4, '#94A3B8', [x, 3.2, 0], undefined, 6)
  // sombra no chão para dar leitura de profundidade
  g.box(6.8, 0.004, 0.5, '#CDBFA8', [0, 0.004, 0])
  return g.build()
}

export const OBSTACLE_MODELS: Record<ObstacleKind, () => THREE.BufferGeometry> = {
  livros: books,
  carteira: desk,
  caixas: boxes,
  carrinho: cart,
  barreira: barrier,
  faixa: banner,
}

/** livro coletável: capa (colorida por instância) e miolo branco */
export function collectibleBook() {
  const cover = new THREE.BoxGeometry(0.58, 0.76, 0.14)
  const pages = new THREE.BoxGeometry(0.53, 0.7, 0.15)
  pages.translate(0.03, 0, 0)
  return { cover, pages }
}
