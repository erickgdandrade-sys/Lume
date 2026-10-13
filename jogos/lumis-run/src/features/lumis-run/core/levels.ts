import { CORRIDOR } from '../config/gameConfig'

/**
 * Níveis por distância. Cada nível tem um cenário (10 no total; do 11º em
 * diante eles se repetem) e começa numa "janela" que a Lumis atravessa.
 * Os níveis ficam um pouco mais longos conforme a corrida acelera.
 */
export const SCENARIO_COUNT = 10

/** comprimento do nível n (m): 12 segmentos no 1º, um a mais por nível, até 22 */
export const levelLength = (n: number) => Math.min(22, 11 + n) * CORRIDOR.segmentLength

const starts = [0, 0]

/** distância (m) em que o nível n começa (n ≥ 1) */
export function levelStart(n: number) {
  while (starts.length <= n) {
    const m = starts.length
    starts.push(starts[m - 1] + levelLength(m - 1))
  }
  return starts[n]
}

/** nível na distância d da pista (≥ 1) */
export function levelAtDistance(d: number) {
  let n = 1
  while (levelStart(n + 1) <= d) n++
  return n
}

/** cenário (0..9) do nível n */
export const scenarioOfLevel = (n: number) => (Math.max(1, n) - 1) % SCENARIO_COUNT

/**
 * Transição entre níveis, em segundos em relação ao momento em que a Lumis
 * passa pela janela: o pulo começa antes, e depois a câmera se aproxima
 * enquanto ela se espanta e acena. A pista fica livre nesse trecho.
 */
export const TRANSITION = {
  leapStart: -0.55,
  leapEnd: 0.35,
  greetEnd: 2.9,
} as const

/**
 * Trecho sem obstáculos ao redor do início do nível n, para a velocidade v.
 * A janela visível pode cair até um segmento depois de levelStart (ela se
 * alinha aos segmentos do cenário), por isso o trecho cobre esse segmento.
 */
export function clearZone(n: number, v: number): [number, number] {
  const b = levelStart(n)
  return [b + TRANSITION.leapStart * v - 5, b + CORRIDOR.segmentLength + TRANSITION.greetEnd * v + 6]
}

/**
 * Onde a janela do nível n aparece no cenário: o primeiro limite de segmento
 * a partir de levelStart(n), no espaço da vista (distância da pista + offset,
 * o quanto o corredor do menu já tinha andado antes da partida).
 */
export function visualStart(n: number, offset: number) {
  if (n <= 1) return -Infinity
  const L = CORRIDOR.segmentLength
  return Math.ceil((levelStart(n) + offset) / L - 1e-9) * L
}

/** nível que aparece no cenário para o segmento que começa em viewD */
export function visualLevelAt(viewD: number, offset: number) {
  let n = Math.max(1, levelAtDistance(viewD - offset) - 1)
  while (visualStart(n + 1, offset) <= viewD + 1e-6) n++
  return n
}

/** nomes dos cenários, na mesma ordem de render/scenery (mostrados na faixa de nível) */
export const SCENARIO_NAMES = [
  'Corredor da escola',
  'Rua da escola',
  'Quadra de jogos',
  'Biblioteca',
  'Laboratório de ciências',
  'Refeitório',
  'Sala de artes',
  'Horta da escola',
  'Parquinho',
  'Formatura',
] as const

export const scenarioName = (level: number) => SCENARIO_NAMES[scenarioOfLevel(level)]
