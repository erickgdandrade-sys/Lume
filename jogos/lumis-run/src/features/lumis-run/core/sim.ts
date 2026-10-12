import { laneX, LANES } from '../config/gameConfig'
import { speedAt } from '../config/difficulty'
import { STEP } from './fixedStep'
import { createGen, fillUntil, prune, warmupBooks, type GenState } from './generator'
import { ALL_HALF, LANE_HALF, OBSTACLES, type Obstacle } from './obstacles'
import { mulberry32 } from './rng'
import { computeScore } from './score'

/**
 * Simulação da corrida: TypeScript puro, passo fixo de 1/120 s, sem React,
 * sem Math.random e sem funções trigonométricas (resultado idêntico em
 * qualquer navegador para a mesma semente e os mesmos comandos).
 */
export type Command = 'left' | 'right' | 'jump' | 'slide'
export type Action = 'run' | 'jump' | 'dive' | 'land' | 'slide' | 'impact'

export const MOVE = {
  laneTime: 0.15,
  jumpTime: 0.62,
  jumpHeight: 1.6,
  diveTime: 0.12, // descida rápida ao pedir deslize no ar
  landTime: 0.12,
  slideTime: 0.7,
  bufferTime: 0.14, // comando dado pouco antes de aterrissar é guardado
} as const

export const HITBOX = {
  halfWidth: 0.4,
  halfDepth: 0.3,
  runBottom: 0.45,
  runTop: 1.45,
  slideBottom: 0.15,
  slideTop: 0.72,
} as const

export const AHEAD = 140 // metros de pista gerados à frente

export interface SimEvent {
  type: 'book' | 'crash' | 'jump' | 'slide' | 'lane'
  tick: number
  bookId?: number
  x?: number
  y?: number
}

export interface SimState {
  seed: number
  tick: number
  time: number
  distance: number
  speed: number
  lane: number
  x: number
  xFrom: number
  laneT: number
  action: Action
  actionT: number
  air: number // altura atual acima do chão (salto)
  diveFrom: number
  buffered: Command | null
  bufferT: number
  books: number
  crashed: boolean
  crashedBy: Obstacle | null
  gen: GenState
  events: SimEvent[]
}

export function createSim(seed: number): SimState {
  const gen = createGen(mulberry32(seed))
  warmupBooks(gen)
  fillUntil(gen, AHEAD, 0)
  return {
    seed,
    tick: 0,
    time: 0,
    distance: 0,
    speed: speedAt(0),
    lane: 1,
    x: 0,
    xFrom: 0,
    laneT: MOVE.laneTime,
    action: 'run',
    actionT: 0,
    air: 0,
    diveFrom: 0,
    buffered: null,
    bufferT: 0,
    books: 0,
    crashed: false,
    crashedBy: null,
    gen,
    events: [],
  }
}

export const jumpCurve = (t: number) => {
  const p = t / MOVE.jumpTime
  return p <= 0 || p >= 1 ? 0 : 4 * MOVE.jumpHeight * p * (1 - p)
}

const grounded = (a: Action) => a === 'run' || a === 'land' || a === 'slide'

function setAction(s: SimState, a: Action) {
  s.action = a
  s.actionT = 0
}

function tryCommand(s: SimState, c: Command): boolean {
  switch (c) {
    case 'left':
    case 'right': {
      const next = Math.max(0, Math.min(LANES.count - 1, s.lane + (c === 'left' ? -1 : 1)))
      if (next === s.lane) return true
      s.xFrom = s.x
      s.lane = next
      s.laneT = 0
      s.events.push({ type: 'lane', tick: s.tick })
      return true
    }
    case 'jump':
      if (!grounded(s.action)) return false // sem pulo duplo: fica guardado
      setAction(s, 'jump')
      s.events.push({ type: 'jump', tick: s.tick })
      return true
    case 'slide':
      if (s.action === 'jump') {
        // no ar: desce rápido e desliza ao tocar o chão
        s.diveFrom = s.air
        setAction(s, 'dive')
        return true
      }
      if (s.action === 'slide' || s.action === 'dive') return false
      setAction(s, 'slide')
      s.events.push({ type: 'slide', tick: s.tick })
      return true
  }
}

/** aplica um comando do jogador; os que não cabem agora ficam guardados por pouco tempo */
export function command(s: SimState, c: Command) {
  if (s.crashed) return
  if (!tryCommand(s, c)) {
    s.buffered = c
    s.bufferT = MOVE.bufferTime
  }
}

export function lumisBounds(s: SimState) {
  if (s.action === 'slide') return { bottom: HITBOX.slideBottom, top: HITBOX.slideTop }
  return { bottom: HITBOX.runBottom + s.air, top: HITBOX.runTop + s.air }
}

function collides(s: SimState, o: Obstacle) {
  const spec = OBSTACLES[o.kind]
  if (Math.abs(o.d - s.distance) > spec.depth / 2 + HITBOX.halfDepth) return false
  const cx = spec.span === 'todas' ? 0 : laneX(o.lane)
  const half = spec.span === 'todas' ? ALL_HALF : LANE_HALF
  if (Math.abs(s.x - cx) > half + HITBOX.halfWidth) return false
  const b = lumisBounds(s)
  return b.top > spec.y0 && b.bottom < spec.y1
}

export function step(s: SimState) {
  if (s.crashed) return
  s.tick++
  s.time = s.tick * STEP
  s.speed = speedAt(s.time)
  s.distance += s.speed * STEP

  // troca de faixa interpolada (ease-out cúbico, sem teletransporte)
  if (s.laneT < MOVE.laneTime) {
    s.laneT = Math.min(MOVE.laneTime, s.laneT + STEP)
    const p = 1 - s.laneT / MOVE.laneTime
    const e = 1 - p * p * p
    s.x = s.xFrom + (laneX(s.lane) - s.xFrom) * e
  } else s.x = laneX(s.lane)

  // estados verticais
  s.actionT += STEP
  switch (s.action) {
    case 'jump':
      s.air = jumpCurve(s.actionT)
      if (s.actionT >= MOVE.jumpTime) {
        s.air = 0
        setAction(s, 'land')
      }
      break
    case 'dive': {
      const k = 1 - s.actionT / MOVE.diveTime
      s.air = k > 0 ? s.diveFrom * k : 0
      if (s.actionT >= MOVE.diveTime) {
        s.air = 0
        setAction(s, 'slide')
        s.events.push({ type: 'slide', tick: s.tick })
      }
      break
    }
    case 'land':
      if (s.actionT >= MOVE.landTime) setAction(s, 'run')
      break
    case 'slide':
      if (s.actionT >= MOVE.slideTime) setAction(s, 'run')
      break
  }

  // comando guardado
  if (s.buffered) {
    s.bufferT -= STEP
    if (s.bufferT <= 0) s.buffered = null
    else if (tryCommand(s, s.buffered)) s.buffered = null
  }

  // coleta de livros
  const b = lumisBounds(s)
  const cy = (b.bottom + b.top) / 2
  for (const book of s.gen.books) {
    if (book.taken) continue
    if (book.d > s.distance + 1) break
    if (Math.abs(book.d - s.distance) < 0.7 && Math.abs(laneX(book.lane) - s.x) < 0.8 && Math.abs(book.y - cy) < 0.85) {
      book.taken = true
      s.books++
      s.events.push({ type: 'book', tick: s.tick, bookId: book.id, x: laneX(book.lane), y: book.y })
    }
  }

  // colisões
  for (const o of s.gen.obstacles) {
    if (o.d > s.distance + 2) break
    if (collides(s, o)) {
      s.crashed = true
      s.crashedBy = o
      setAction(s, 'impact')
      s.events.push({ type: 'crash', tick: s.tick })
      return
    }
  }

  // mantém a pista à frente e limpa o que ficou para trás
  fillUntil(s.gen, s.distance + AHEAD, s.time)
  prune(s.gen, s.distance)
}

export const scoreOf = (s: SimState) => computeScore(s.distance, s.books)
