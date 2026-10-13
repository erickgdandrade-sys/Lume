/**
 * Tipos de obstáculo. A colisão usa caixas alinhadas no espaço das faixas:
 * largura (uma faixa ou o corredor todo), altura (y0..y1) e profundidade.
 */
export type ObstacleKind = 'livros' | 'carteira' | 'caixas' | 'carrinho' | 'barreira' | 'faixa' | 'placa'
export type Clear = 'pular' | 'deslizar' | 'nenhum'

export interface ObstacleSpec {
  span: 'faixa' | 'todas'
  y0: number
  y1: number
  depth: number
  clear: Clear // como passar por ele sem trocar de faixa
}

export const OBSTACLES: Record<ObstacleKind, ObstacleSpec> = {
  livros: { span: 'faixa', y0: 0, y1: 0.85, depth: 0.7, clear: 'pular' },
  carteira: { span: 'faixa', y0: 0, y1: 1.0, depth: 0.8, clear: 'pular' },
  caixas: { span: 'faixa', y0: 0, y1: 2.0, depth: 0.9, clear: 'nenhum' },
  carrinho: { span: 'faixa', y0: 0, y1: 1.7, depth: 1.0, clear: 'nenhum' },
  barreira: { span: 'todas', y0: 0, y1: 0.55, depth: 0.35, clear: 'pular' },
  faixa: { span: 'todas', y0: 1.0, y1: 4.4, depth: 0.3, clear: 'deslizar' },
  // placa suspensa numa faixa só: passa deslizando por baixo
  placa: { span: 'faixa', y0: 1.0, y1: 2.4, depth: 0.3, clear: 'deslizar' },
}

export const LANE_HALF = 0.85 // meia largura ocupada por um obstáculo de uma faixa
export const ALL_HALF = 3.4 // meia largura de um obstáculo que fecha o corredor

export interface Obstacle {
  id: number
  kind: ObstacleKind
  lane: number // ignorado quando span = 'todas'
  d: number // posição na pista (m)
  variant: number // variação visual
}

export interface Book {
  id: number
  lane: number
  d: number
  y: number
  taken: boolean
  color: number
}
