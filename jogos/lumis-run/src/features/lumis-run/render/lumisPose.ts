import { LUMIS } from '../config/gameConfig'

/**
 * Animações da Lumis calculadas por funções puras do tempo.
 * A Lumis não tem braços nem pernas: a "corrida" é feita com flutuação,
 * inclinação, balanço e squash-and-stretch.
 *
 * Convenção: o rosto do modelo aponta para +Z. Na corrida ela olha para a
 * frente (-Z), de costas para a câmera, então a rotação base em Y é PI.
 */
export type LumisMode = 'menu' | 'greet' | 'run' | 'jump' | 'land' | 'slide' | 'impact' | 'celebrate'
export type Expression = 'alegria' | 'concentracao' | 'surpresa' | 'feliz'

export interface Pose {
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  sx: number
  sy: number
  sz: number
  expression: Expression
  blink: number // 0 aberto, 1 fechado
  /** ângulo da ponta direita da estrela (o "bracinho" do tchau), em radianos */
  wave: number
}

export const TIMING = {
  jump: 0.62,
  jumpHeight: 1.6,
  land: 0.18,
  slide: 0.7,
  slideBlend: 0.09,
  impact: 0.55,
  runHz: 2.4,
} as const

const TAU = Math.PI * 2
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** tchau: a ponta levanta e balança */
export function waveAngle(t: number) {
  return 0.35 + Math.sin(t * TAU * 2.6) * 0.4
}

/** envelope 0..1 que sobe, segura e desce */
function envelope(t: number, start: number, end: number, fade = 0.25) {
  if (t <= start || t >= end) return 0
  return easeInOut(Math.min(1, (t - start) / fade, (end - t) / fade))
}

export const WAVE_TIME = 1.8
export const TWIRL_TIME = 0.75

/**
 * Durante a corrida (ao passar de nível): vira para a câmera, dá tchau e
 * volta a olhar para a frente. Não muda a simulação, só a pose.
 */
export function overlayWave(p: Pose, t: number) {
  const k = envelope(t, 0, WAVE_TIME, 0.35)
  p.ry = lerp(p.ry, 0.22, k)
  p.rx = lerp(p.rx, 0, k)
  p.wave = waveAngle(t) * envelope(t, 0.2, WAVE_TIME - 0.25, 0.2)
  if (k > 0.5) p.expression = 'alegria'
  return p
}

/** giro de alegria ao passar o recorde do evento */
export function overlayTwirl(p: Pose, t: number) {
  const k = clamp01(t / TWIRL_TIME)
  p.ry += TAU * easeInOut(k)
  p.y += Math.sin(k * Math.PI) * 0.35
  p.expression = 'feliz'
  return p
}

/** Altura do salto em função do tempo desde o início (parábola simétrica). */
export function jumpHeight(t: number) {
  const p = clamp01(t / TIMING.jump)
  return 4 * TIMING.jumpHeight * p * (1 - p)
}

/** Piscadas regulares, com leve variação para não parecer mecânico. */
function blinkAt(time: number) {
  const period = 3.4
  const local = (time + Math.sin(time * 0.37) * 0.6) % period
  return local < 0.12 ? Math.sin((local / 0.12) * Math.PI) : 0
}

/**
 * @param mode       estado atual
 * @param t          segundos desde que o estado começou
 * @param time       relógio global (para ciclos contínuos)
 * @param lateral    -1..1, velocidade lateral normalizada durante a troca de faixa
 */
export function computePose(mode: LumisMode, t: number, time: number, lateral = 0): Pose {
  const hover = LUMIS.hoverHeight
  const phase = time * TAU * TIMING.runHz
  const bank = -lateral * 0.38
  const base: Pose = {
    y: hover,
    z: 0,
    rx: 0.2,
    ry: Math.PI + lateral * 0.5,
    rz: bank,
    sx: 1,
    sy: 1,
    sz: 1,
    expression: 'concentracao',
    blink: blinkAt(time),
    wave: 0,
  }

  switch (mode) {
    case 'menu': {
      base.y = hover + 0.12 + Math.sin(time * 1.6) * 0.08
      base.rx = Math.sin(time * 0.9) * 0.06
      base.ry = Math.sin(time * 0.7) * 0.28
      base.rz = Math.sin(time * 1.1) * 0.08
      const s = Math.sin(time * 3.2) * 0.02
      base.sy = 1 + s
      base.sx = base.sz = 1 - s / 2
      base.expression = 'alegria'
      // de tempos em tempos, dá tchau para quem passa no stand
      const c = time % 9
      const w = envelope(c, 5.4, 7.4, 0.3)
      if (w > 0) {
        base.wave = waveAngle(c) * w
        base.ry = lerp(base.ry, 0.12, w)
        base.rz += 0.06 * w
      }
      return base
    }
    case 'greet': {
      // contagem: olha para a câmera, dá tchau e vira para correr
      const turn = t < 2.35 ? 0 : easeInOut(clamp01((t - 2.35) / 0.55))
      base.y = hover + 0.08 + Math.sin(time * 4.2) * 0.05
      base.ry = lerp(0.15, Math.PI, turn)
      base.rx = lerp(0, 0.2, turn)
      base.rz = Math.sin(time * 1.3) * 0.05
      base.wave = waveAngle(t) * envelope(t, 0.15, 2.45, 0.25)
      base.expression = turn > 0.6 ? 'concentracao' : 'alegria'
      return base
    }
    case 'run': {
      const bob = Math.sin(phase)
      base.y = hover + Math.abs(bob) * 0.14
      base.rz += Math.sin(phase) * 0.1
      const squash = Math.cos(phase * 2) * 0.045
      base.sy = 1 + squash
      base.sx = base.sz = 1 - squash / 2
      return base
    }
    case 'jump': {
      const p = clamp01(t / TIMING.jump)
      base.y = hover + jumpHeight(t)
      // giro completo no ar: mostra o rosto para a câmera no meio do salto
      base.ry = Math.PI + TAU * easeInOut(p)
      base.rx = 0.2 - Math.sin(p * Math.PI) * 0.25
      const stretch = t < 0.1 ? 1 - t / 0.1 : 0
      base.sy = 1 + 0.22 * stretch + Math.sin(p * Math.PI) * 0.05
      base.sx = base.sz = 1 - 0.12 * stretch
      base.expression = 'alegria'
      return base
    }
    case 'land': {
      const p = clamp01(t / TIMING.land)
      const k = Math.sin(p * Math.PI) * (1 - p * 0.3)
      base.y = hover - 0.18 * k
      base.sy = 1 - 0.28 * k
      base.sx = base.sz = 1 + 0.18 * k
      return base
    }
    case 'slide': {
      const inK = clamp01(t / TIMING.slideBlend)
      const outK = clamp01((TIMING.slide - t) / TIMING.slideBlend)
      const k = easeOut(Math.min(inK, outK))
      base.y = hover - (hover - 0.4) * k
      base.rx = 0.2 + 0.55 * k
      base.sy = 1 - 0.48 * k
      base.sx = base.sz = 1 + 0.3 * k
      base.rz += Math.sin(time * 40) * 0.03 * k
      return base
    }
    case 'impact': {
      const p = clamp01(t / TIMING.impact)
      const e = easeOut(p)
      base.z = 0.7 * e
      base.y = hover + Math.sin(p * Math.PI) * 0.45
      base.ry = Math.PI + Math.PI * e // vira para a câmera
      base.rx = -0.35 * Math.sin(p * Math.PI)
      base.rz = Math.sin(t * 38) * 0.22 * (1 - p)
      const hit = t < 0.12 ? 1 - t / 0.12 : 0
      base.sx = base.sz = 1 + 0.3 * hit
      base.sy = 1 - 0.3 * hit
      base.expression = 'surpresa'
      base.blink = 0
      return base
    }
    case 'celebrate': {
      const turn = easeOut(clamp01(t / 0.45))
      const hop = Math.abs(Math.sin(t * Math.PI * 1.9))
      base.ry = Math.PI + Math.PI * turn
      base.y = hover + 0.1 + hop * 0.55
      base.rx = 0
      base.rz = Math.sin(t * 5) * 0.12
      const squash = hop < 0.15 ? (0.15 - hop) * 1.6 : 0
      base.sy = 1 - squash + hop * 0.06
      base.sx = base.sz = 1 + squash * 0.6
      base.expression = 'feliz'
      return base
    }
  }
}
