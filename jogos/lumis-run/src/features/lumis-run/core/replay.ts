import { SIM } from '../config/gameConfig'
import { command, createSim, scoreOf, step, type Command } from './sim'

/**
 * Reexecuta uma partida a partir da semente e dos comandos registrados
 * ([passo, comando]). É o que o servidor usa para calcular a pontuação
 * oficial: o número enviado pelo navegador só serve para conferência.
 */
export const COMMANDS: readonly Command[] = ['left', 'right', 'jump', 'slide']
/** partida mais longa aceita: 30 minutos de corrida */
export const MAX_TICKS = SIM.stepHz * 60 * 30
export const MAX_COMMANDS = 40000

export type ReplayResult =
  | { ok: true; score: number; distance: number; books: number; durationMs: number; ticks: number }
  | { ok: false; reason: 'comandos' | 'sem-fim' }

export function isCommandLog(v: unknown): v is [number, Command][] {
  if (!Array.isArray(v) || v.length > MAX_COMMANDS) return false
  let last = 0
  for (const e of v) {
    if (!Array.isArray(e) || e.length !== 2) return false
    const [t, c] = e
    if (!Number.isInteger(t) || t < last || t > MAX_TICKS || !COMMANDS.includes(c)) return false
    last = t
  }
  return true
}

export function replay(seed: number, log: [number, Command][]): ReplayResult {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !isCommandLog(log)) return { ok: false, reason: 'comandos' }
  const s = createSim(seed)
  let i = 0
  while (!s.crashed && s.tick < MAX_TICKS) {
    // mesma ordem da sessão: comandos do passo atual entram antes de avançar
    while (i < log.length && log[i][0] === s.tick) command(s, log[i++][1])
    step(s)
    s.events.length = 0
  }
  // comandos depois da batida (ou sobrando) indicam um registro adulterado
  if (!s.crashed || i < log.length) return { ok: false, reason: s.crashed ? 'comandos' : 'sem-fim' }
  return { ok: true, score: scoreOf(s), distance: s.distance, books: s.books, durationMs: Math.round(s.time * 1000), ticks: s.tick }
}
