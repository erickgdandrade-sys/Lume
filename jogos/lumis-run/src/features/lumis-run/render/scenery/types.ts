import type * as THREE from 'three'
import type { SidePiece } from './kit'

/** clima de luz de cada cenário; a cena muda suavemente de um para o outro */
export interface Atmosphere {
  /** céu: topo e horizonte (o horizonte também é a cor da neblina) */
  skyTop: string
  horizon: string
  fogNear: number
  fogFar: number
  hemiSky: string
  hemiGround: string
  hemi: number
  sun: string
  sunIntensity: number
  /** direção do sol em relação à Lumis: [x, y, z] */
  sunDir: [number, number, number]
  fill: string
  fillIntensity: number
}

export interface ScenarioDef {
  name: string
  outdoor: boolean
  atmosphere: Atmosphere
  /** textura do chão das faixas (cobre 4 m × 4 m por repetição) */
  floor: () => THREE.Texture
  floorRoughness: number
  /** peças de todo segmento (teto, chão além das paredes, marcações) */
  common: () => SidePiece
  /** variações de cada lado; o lado é -1 (esquerda) ou 1 (direita) */
  sides: ((side: -1 | 1) => SidePiece)[]
  /** cores da fachada com a janela que leva a este cenário */
  facade: { wall: string; frame: string; sign: string; signText: string }
}
