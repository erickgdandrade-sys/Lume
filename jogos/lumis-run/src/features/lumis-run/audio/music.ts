/**
 * Trilhas do jogo, compostas em código (sem arquivos de áudio).
 * Cada trilha é um laço de 4 compassos em semicolcheias (16 passos por compasso).
 * Notas em MIDI (60 = Dó central). null = pausa.
 */
export type TrackName = 'menu' | 'run'

export interface Track {
  bpm: number
  /** acordes por compasso (notas MIDI) */
  chords: number[][]
  /** baixo por passo (64 passos) */
  bass: (number | null)[]
  /** melodia A e B, alternadas a cada volta do laço */
  lead: (number | null)[][]
  /** bateria: k = bumbo, s = caixa, h = chimbal, o = chimbal aberto */
  drums: string
  leadWave: OscillatorType
}

const C = [60, 64, 67]
const G = [59, 62, 67]
const Am = [57, 60, 64]
const F = [57, 60, 65]

const _ = null

/** baixo saltitante: tônica e oitava */
function bounceBass(roots: number[]) {
  const out: (number | null)[] = []
  for (const r of roots) out.push(r, _, r + 12, _, r, _, r + 12, r + 7, r, _, r + 12, _, r + 7, _, r + 12, _)
  return out
}

/** arpejo em semicolcheias sobre os acordes, uma oitava acima */
function arpeggio(chords: number[][]) {
  const out: (number | null)[] = []
  const shape = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 3, 2]
  for (const ch of chords) {
    const notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
    for (const i of shape) out.push(notes[i])
  }
  return out
}

// melodia principal, alegre, em Dó maior
const RUN_A: (number | null)[] = [
  76, _, 79, _, 84, _, _, 83, 81, _, 79, _, 76, _, 79, _,
  74, _, 79, _, 83, _, 81, _, 79, _, 74, _, 71, _, 74, _,
  72, _, 76, _, 81, _, 79, _, 76, _, 81, _, 84, _, 83, _,
  81, _, 79, _, 77, _, 76, _, 74, _, 77, _, 79, _, _, _,
]

const MENU_LEAD: (number | null)[] = [
  76, _, _, _, 79, _, _, 76, 72, _, _, _, 74, _, 76, _,
  72, _, _, _, 76, _, _, 72, 69, _, _, _, 72, _, _, _,
  69, _, _, _, 72, _, _, 77, 76, _, _, _, 74, _, 72, _,
  71, _, _, _, 74, _, _, 79, 79, _, _, _, _, _, _, _,
]

export const TRACKS: Record<TrackName, Track> = {
  run: {
    bpm: 132,
    chords: [C, G, Am, F],
    bass: bounceBass([36, 31, 33, 29]),
    lead: [RUN_A, arpeggio([C, G, Am, F])],
    drums: 'k.h.s.h.k.hkskh.'.repeat(3) + 'k.h.s.h.k.s.ssso',
    leadWave: 'square',
  },
  menu: {
    bpm: 96,
    chords: [C, Am, F, G],
    bass: [36, _, _, _, _, _, _, _, 43, _, _, _, _, _, _, _, 33, _, _, _, _, _, _, _, 40, _, _, _, _, _, _, _, 29, _, _, _, _, _, _, _, 36, _, _, _, _, _, _, _, 31, _, _, _, _, _, _, _, 38, _, _, _, _, _, _, _],
    lead: [MENU_LEAD, arpeggio([C, Am, F, G]).map((n, i) => (i % 2 ? null : n))],
    drums: '..h...h...h...h.'.repeat(4),
    leadWave: 'triangle',
  },
}

export const STEPS = 64
export const midiToHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
