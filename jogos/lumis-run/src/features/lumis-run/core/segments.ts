import { CORRIDOR } from '../config/gameConfig'

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
