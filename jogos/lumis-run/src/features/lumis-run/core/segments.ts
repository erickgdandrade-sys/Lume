import { CORRIDOR } from '../config/gameConfig'
import { hashInt } from './rng'

export const SIDE_VARIANT_COUNT = 4

/** variação de cada lado do segmento k, estável para o mesmo k */
export function variantFor(k: number, side: -1 | 1) {
  // o primeiro segmento é sempre de armários, para o menu ter um fundo previsível
  if (k <= 0) return 0
  return hashInt(k, side === -1 ? 7 : 13) % SIDE_VARIANT_COUNT
}

/** índices dos segmentos visíveis e a posição z de início de cada um */
export function visibleSegments(distance: number) {
  const L = CORRIDOR.segmentLength
  const base = Math.floor(distance / L)
  const out: { k: number; z: number }[] = []
  for (let i = 0; i < CORRIDOR.segmentsAhead + CORRIDOR.segmentsBehind + 1; i++) {
    const k = base - CORRIDOR.segmentsBehind + i
    out.push({ k, z: distance - k * L })
  }
  return out
}
