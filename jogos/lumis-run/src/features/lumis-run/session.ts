import { levelStart, TRANSITION, visualLevelAt, visualStart } from './core/levels'
import { FixedStepper } from './core/fixedStep'
import { command, createSim, scoreOf, step, type Command, type SimState } from './core/sim'
import type { InputAction, InputDevice } from './input/actions'
import { sound } from './audio/sound'
import { input } from './input/inputManager'
import { cleanName } from './ranking/names'
import { phoneDigits } from './ranking/phone'
import { photos } from './ranking/photos'
import { ranking } from './ranking/store'
import { randomPose } from './share/poses'
import { useUi, type Screen } from './ui/uiStore'

/**
 * Sessão de jogo: liga a simulação, a entrada e a interface.
 * Existe uma única sessão; cada partida cria um SimState novo, então nada da
 * partida anterior (obstáculos, pontos, comandos) sobrevive ao reinício.
 */
export const CRASH_HOLD = 1.1 // s de animação de impacto antes do resultado
export const COUNTDOWN = 3

type Phase = 'idle' | 'countdown' | 'running' | 'paused' | 'crashed' | 'over'

const GAME_COMMANDS: Partial<Record<InputAction, Command>> = {
  left: 'left',
  right: 'right',
  up: 'jump',
  confirm: 'jump',
  down: 'slide',
  back: 'slide',
}

export interface EffectEvent {
  seq: number
  type: 'book' | 'crash'
  x: number
  y: number
}

class GameSession {
  sim: SimState | null = null
  phase: Phase = 'idle'
  private stepper = new FixedStepper()
  private queue: Command[] = []
  /** registro dos comandos (passo, comando): base da validação por reexecução na Fase 6 */
  log: [number, Command][] = []
  private ticket: { token: string; seed: number } | null = null
  private hudTimer = 0
  private phaseTime = 0
  private runToken = 0
  idleDistance = 0
  private offset = 0
  effect: EffectEvent = { seq: 0, type: 'book', x: 0, y: 0 }
  menuTime = 0
  /** segundos desde a última troca de nível e desde que passou o recorde (animações da Lumis) */
  levelUpClock = 99
  recordClock = 99
  private level = 1
  private recordBeaten = false

  /** segundos desde a última troca de fase (para animações) */
  get phaseClock() {
    return this.phaseTime
  }

  constructor() {
    input.subscribe((a, d) => this.onInput(a, d))
    input.onDeviceChange = (d) => useUi.getState().set({ device: d })
    input.onPadChange = (p) => useUi.getState().set({ pad: p })
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.phase === 'running') this.pause('aba')
      })
    }
  }

  go(screen: Screen) {
    const st = useUi.getState()
    st.set({ screen, previous: st.screen })
    input.setContext(screen === 'jogo' ? 'game' : screen === 'nome' || screen === 'equipe' ? 'text' : 'menu')
    input.latch()
  }

  /** começa a contagem para uma partida nova; o cadastro é feito no fim */
  start(demo = false) {
    // proteção contra duplo clique / dois botões ao mesmo tempo
    if (this.phase === 'countdown' || this.phase === 'running') return
    const record = ranking.byScore()[0]?.score ?? null
    this.offset = this.viewDistance
    // partida oficial usa a semente de um bilhete do servidor (ranking online)
    // treino a partir de um nível (?nivel=N): não vale para o ranking
    const practice = practiceStart()
    if (practice > 0) demo = true
    this.ticket = demo ? null : ranking.takeTicket()
    this.sim = createSim(this.ticket?.seed ?? newSeed(), practice)
    this.queue = []
    this.log = []
    this.stepper.reset()
    this.phase = 'countdown'
    this.phaseTime = 0
    this.runToken++
    this.level = this.levelNow()
    this.levelUpClock = this.recordClock = 99
    this.recordBeaten = false
    sound.setLevel(1)
    sound.duck(false)
    sound.music(null)
    sound.play('count')
    useUi.getState().set({ demo, record, result: null, pauseReason: null, countdown: COUNTDOWN, hud: { score: 0, books: 0, time: 0, level: this.level } })
    this.go('contagem')
  }

  restart() {
    this.phase = 'idle'
    this.start(useUi.getState().demo)
  }

  pause(reason: 'jogador' | 'controle' | 'aba' = 'jogador') {
    if (this.phase !== 'running' && this.phase !== 'countdown') return
    this.phase = 'paused'
    this.queue = []
    sound.duck(true)
    useUi.getState().set({ pauseReason: reason })
    this.go('pausa')
  }

  resume() {
    if (this.phase !== 'paused') return
    // volta com uma contagem curta para o jogador se reposicionar
    this.phase = 'countdown'
    this.phaseTime = COUNTDOWN - 1.5
    this.stepper.reset()
    sound.duck(false)
    useUi.getState().set({ pauseReason: null, countdown: 2 })
    this.go('contagem')
  }

  /** volta ao menu e esquece o jogador (próximo jogador) */
  toMenu() {
    this.idleDistance = this.viewDistance
    this.phase = 'idle'
    this.sim = null
    this.queue = []
    sound.duck(false)
    sound.music('menu')
    useUi.getState().set({ player: null, demo: false, result: null, pauseReason: null })
    this.go('menu')
  }

  private onInput(a: InputAction, _d: InputDevice) {
    sound.unlock()
    if (a === 'disconnect') {
      if (this.phase === 'running' || this.phase === 'countdown') this.pause('controle')
      return
    }
    if (this.phase !== 'running') return
    if (a === 'pause') return this.pause('jogador')
    const c = GAME_COMMANDS[a]
    if (c) this.queue.push(c)
  }

  /** chamado uma vez por quadro, antes de desenhar */
  update(dt: number) {
    const s = this.sim
    this.menuTime += dt
    if (this.phase === 'idle' || !s) {
      this.idleDistance += 3 * Math.min(dt, 0.1)
      return
    }
    if (this.phase === 'countdown') {
      this.phaseTime += Math.min(dt, 0.1)
      const left = Math.max(0, Math.ceil(COUNTDOWN - this.phaseTime))
      if (left !== useUi.getState().countdown) {
        useUi.getState().set({ countdown: left })
        if (left > 0) sound.play('count')
      }
      if (this.phaseTime >= COUNTDOWN) {
        sound.play('go')
        sound.music('run')
        this.phase = 'running'
        this.queue = []
        this.stepper.reset()
        this.go('jogo')
      }
      return
    }
    if (this.phase === 'running') {
      const { steps } = this.stepper.advance(dt)
      for (let i = 0; i < steps && !s.crashed; i++) {
        // comandos entram no início do passo, registrados com o número do passo
        while (this.queue.length) {
          const c = this.queue.shift()!
          this.log.push([s.tick, c])
          command(s, c)
        }
        step(s)
      }
      for (const e of s.events) {
        if (e.type === 'book') {
          this.effect = { seq: this.effect.seq + 1, type: 'book', x: e.x ?? s.x, y: e.y ?? 1 }
          sound.play('book')
        } else if (e.type === 'crash') {
          this.effect = { seq: this.effect.seq + 1, type: 'crash', x: s.x, y: 1 }
          input.rumble(260)
          sound.music(null)
          sound.play('crash')
        } else if (e.type === 'jump' || e.type === 'slide' || e.type === 'lane') sound.play(e.type)
      }
      s.events.length = 0
      this.levelUpClock += dt
      this.recordClock += dt
      const lvl = this.levelNow()
      if (lvl > this.level && !s.crashed) {
        this.level = lvl
        this.levelUpClock = 0
        sound.setLevel(lvl)
        sound.play('level')
      }
      const rec = useUi.getState().record
      if (!this.recordBeaten && rec != null && rec > 0 && !useUi.getState().demo && scoreOf(s) > rec) {
        this.recordBeaten = true
        this.recordClock = 0
        sound.play('record')
      }
      ;(globalThis as unknown as { __lumisDebug?: object }).__lumisDebug = { x: s.x, lane: s.lane, tick: s.tick }
      this.hudTimer += dt
      if (this.hudTimer >= 0.1 || s.crashed) {
        this.hudTimer = 0
        useUi.getState().set({ hud: { score: scoreOf(s), books: s.books, time: s.time, level: this.level } })
      }
      if (s.crashed) {
        this.phase = 'crashed'
        this.phaseTime = 0
        input.setContext('menu')
        input.latch()
      }
      return
    }
    if (this.phase === 'crashed') {
      this.phaseTime += dt
      if (this.phaseTime >= CRASH_HOLD) this.finish()
      return
    }
    if (this.phase === 'over') this.phaseTime += dt
  }

  private finish() {
    const s = this.sim!
    const { player, demo } = useUi.getState()
    this.phase = 'over'
    this.phaseTime = 0
    const run = { score: scoreOf(s), distance: s.distance, books: s.books, durationMs: Math.round(s.time * 1000), seed: s.seed, commands: this.log.slice(), token: this.ticket?.token ?? null }
    const preview = demo ? null : ranking.preview(run, player?.name, player?.phone)
    useUi.getState().set({ result: { score: run.score, books: s.books, distance: Math.floor(s.distance), time: s.time, demo, run, preview, outcome: null, skipped: false, pose: randomPose() } })
    sound.play('fim')
    const token = this.runToken
    setTimeout(() => {
      if (this.phase === 'over' && this.runToken === token) sound.music('menu')
    }, 1400)
    this.go('fim')
  }

  /** cadastro no fim da partida: envia ao ranking (validado no servidor) e abre a tela do QR */
  async register(name: string, phone: string, photo: string | null = null) {
    const st = useUi.getState()
    const r = st.result
    if (!r || r.demo || r.outcome || this.phase !== 'over' || st.saving) return
    st.set({ saving: true })
    const token = this.runToken
    let outcome
    try {
      outcome = await ranking.submit({ ...r.run, name: cleanName(name), phone, photo })
    } finally {
      useUi.getState().set({ saving: false })
    }
    // a pessoa saiu da tela enquanto salvava
    if (this.runToken !== token || this.phase !== 'over') return
    if (photo && outcome.status !== 'recusada') void photos.set(outcome.entry.id, photo)
    sound.play(outcome.status === 'recusada' ? 'error' : 'save')
    useUi.getState().set({ result: { ...r, outcome }, player: { name: outcome.entry.name, phone: phoneDigits(phone) }, record: ranking.byScore()[0]?.score ?? null })
    this.phaseTime = 0
    this.go('compartilhar')
  }

  /** sem cadastro: a pessoa ainda pode levar a arte, sem posição */
  skipRegister() {
    const r = useUi.getState().result
    if (!r || r.outcome) return
    useUi.getState().set({ result: { ...r, skipped: true } })
    this.go('compartilhar')
  }

  /** dados para a renderização */
  get viewDistance() {
    return this.sim ? this.sim.distance + this.offset : this.idleDistance
  }

  /** quanto o corredor do menu já tinha andado quando a partida começou */
  get viewOffset() {
    return this.offset
  }

  /** nível atual: muda quando a Lumis atravessa a janela */
  levelNow() {
    const s = this.sim
    return s ? visualLevelAt(s.distance + this.offset, this.offset) : 1
  }

  /**
   * Transição de nível em andamento: segundos desde que a Lumis passou pela
   * janela (negativo antes dela chegar), ou null fora da transição.
   */
  transition(): { level: number; t: number } | null {
    const s = this.sim
    if (!s || this.phase === 'idle' || s.speed <= 0) return null
    const lv = this.levelNow()
    for (const n of [lv + 1, lv]) {
      if (n < 2) continue
      const t = (s.distance - (visualStart(n, this.offset) - this.offset)) / s.speed
      if (t >= TRANSITION.leapStart - 0.6 && t <= TRANSITION.greetEnd) return { level: n, t }
    }
    return null
  }
}

/**
 * Treino e conferência dos cenários (não vale para o ranking):
 * ?nivel=N começa pouco antes da janela do nível N; ?cenario=N, já dentro dele.
 */
function practiceStart() {
  try {
    const q = new URLSearchParams(location.search)
    const n = Number(q.get('nivel'))
    if (Number.isInteger(n) && n > 1 && n < 100) return levelStart(n) - 25
    const c = Number(q.get('cenario'))
    if (Number.isInteger(c) && c >= 1 && c < 100) return levelStart(c) + 70
  } catch {
    // sem URL (testes)
  }
  return 0
}

function newSeed() {
  try {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0]
  } catch {
    return (Date.now() ^ 0x5bd1e995) >>> 0
  }
}

export const session = new GameSession()
