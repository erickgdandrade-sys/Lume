import type { InputAction } from './actions'

export const SWIPE = { minDistance: 28, maxTime: 450 } as const

/** classifica um gesto; null se for curto ou lento demais */
export function classifySwipe(dx: number, dy: number, ms: number): InputAction | null {
  if (ms > SWIPE.maxTime) return null
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < SWIPE.minDistance) return null
  if (ax > ay) return dx < 0 ? 'left' : 'right'
  return dy < 0 ? 'up' : 'down'
}
