import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export const QUALITY_LEVELS = [
  { dpr: 0.75, shadows: false },
  { dpr: 1, shadows: false },
  { dpr: 1, shadows: true },
  { dpr: 1.5, shadows: true },
  { dpr: 2, shadows: true },
] as const

/**
 * Ajusta a resolução e as sombras conforme o desempenho real.
 * Mede a média dos quadros em janelas de 1,5 s: abaixo de ~50 FPS desce um
 * nível; com folga (≥ 58 FPS) por 3 janelas seguidas, sobe um nível.
 */
export function AdaptiveQuality({ level, setLevel, onSample }: { level: number; setLevel: (l: number) => void; onSample?: (fps: number) => void }) {
  const setDpr = useThree((s) => s.setDpr)
  const acc = useRef({ time: 0, frames: 0, good: 0, applied: -1, ceiling: QUALITY_LEVELS.length - 1 })

  useFrame((_, dt) => {
    const a = acc.current
    if (a.applied !== level) {
      const max = Math.min(window.devicePixelRatio || 1, QUALITY_LEVELS[level].dpr)
      setDpr(Math.max(0.75, max))
      a.applied = level
      a.time = a.frames = a.good = 0
    }
    a.time += dt
    a.frames++
    if (a.time < 1.5) return
    const fps = a.frames / a.time
    onSample?.(fps)
    a.time = a.frames = 0
    if (fps < 50 && level > 0) {
      // um nível que já falhou não volta a ser tentado (evita oscilação)
      a.ceiling = level - 1
      setLevel(level - 1)
    } else if (fps >= 58) {
      if (++a.good >= 3 && level < a.ceiling) setLevel(level + 1)
    } else a.good = 0
  })
  return null
}
