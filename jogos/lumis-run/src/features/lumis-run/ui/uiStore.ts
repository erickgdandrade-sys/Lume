import { create } from 'zustand'
import type { InputDevice } from '../input/actions'
import type { Command } from '../core/sim'
import type { SubmitOutcome } from '../ranking/ranking'

/**
 * Estado reativo só do que a interface mostra. A simulação escreve aqui no
 * máximo ~10 vezes por segundo (HUD) e nas trocas de tela.
 */
export type Screen = 'menu' | 'contagem' | 'jogo' | 'pausa' | 'fim' | 'nome' | 'compartilhar' | 'ranking' | 'equipe'

export interface Hud {
  score: number
  books: number
  time: number
  level: number
}

export interface Result {
  score: number
  books: number
  distance: number
  time: number
  demo: boolean
  /** dados exatos da partida, gravados só quando a pessoa se cadastra no fim */
  run: { score: number; distance: number; books: number; durationMs: number; seed: number; commands: [number, Command][]; token: string | null }
  /** posições que a partida teria (antes do cadastro) */
  preview: { posScore: number; posBooks: number } | null
  /** depois do cadastro */
  outcome: SubmitOutcome | null
  /** cadastro pulado: arte sem posição */
  skipped: boolean
  /** imagem oficial da Lumis sorteada para a arte desta partida */
  pose: number
}

interface UiState {
  screen: Screen
  previous: Screen
  /** quem já se cadastrou nesta vez no stand (nome + WhatsApp), para "Jogar de novo" */
  player: { name: string; phone: string } | null
  demo: boolean
  /** recorde do evento (maior pontuação do ranking) */
  record: number | null
  hud: Hud
  countdown: number
  result: Result | null
  /** enviando a partida ao ranking */
  saving: boolean
  pauseReason: 'jogador' | 'controle' | 'aba' | null
  device: InputDevice
  pad: { connected: boolean; label: string }
  fps: number
  quality: number
  webglError: string | null
  set: (p: Partial<Omit<UiState, 'set'>>) => void
}

export const useUi = create<UiState>((set) => ({
  screen: 'menu',
  previous: 'menu',
  player: null,
  demo: false,
  record: null,
  saving: false,
  hud: { score: 0, books: 0, time: 0, level: 1 },
  countdown: 0,
  result: null,
  pauseReason: null,
  device: 'keyboard',
  pad: { connected: false, label: '' },
  fps: 0,
  quality: 3,
  webglError: null,
  set: (p) => set(p),
}))
