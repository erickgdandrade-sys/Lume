import { describe, expect, it } from 'vitest'
import { speedAt, DIFFICULTY } from '../src/features/lumis-run/config/difficulty'
import { laneX } from '../src/features/lumis-run/config/gameConfig'
import { FixedStepper, STEP } from '../src/features/lumis-run/core/fixedStep'
import { laneRequirements, rowIsFeasible } from '../src/features/lumis-run/core/generator'
import { mulberry32 } from '../src/features/lumis-run/core/rng'
import { computeScore } from '../src/features/lumis-run/core/score'
import { command, createSim, jumpCurve, MOVE, scoreOf, step, type Command } from '../src/features/lumis-run/core/sim'
import { SIM } from '../src/features/lumis-run/config/gameConfig'
import { botTick } from './bot'

const run = (s: ReturnType<typeof createSim>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds / STEP) && !s.crashed; i++) step(s)
}
const clearTrack = (s: ReturnType<typeof createSim>) => {
  s.gen.obstacles = []
  s.gen.nextD = 1e9
}

describe('passo fixo', () => {
  it('a simulação avança o mesmo tanto a 30, 60 e 144 FPS', () => {
    for (const fps of [30, 60, 144]) {
      const st = new FixedStepper()
      let steps = 0
      for (let i = 0; i < fps * 10; i++) steps += st.advance(1 / fps).steps
      expect(Math.abs(steps - SIM.stepHz * 10)).toBeLessThanOrEqual(1)
    }
  })
  it('um quadro longo (aba oculta, travada) não gera salto', () => {
    expect(new FixedStepper().advance(5).steps).toBe(Math.floor(SIM.maxFrameDelta / STEP + 1e-9))
  })
})

describe('movimento da Lumis', () => {
  it('troca de faixa é interpolada e termina no centro da faixa', () => {
    const s = createSim(1)
    clearTrack(s)
    command(s, 'right')
    run(s, 0.05)
    expect(s.x).toBeGreaterThan(0)
    expect(s.x).toBeLessThan(laneX(2))
    run(s, 0.2)
    expect(s.x).toBeCloseTo(laneX(2))
    command(s, 'right')
    expect(s.lane).toBe(2) // não sai das três faixas
  })
  it('pulo tem altura e duração definidas e não permite pulo duplo', () => {
    const s = createSim(1)
    clearTrack(s)
    command(s, 'jump')
    run(s, MOVE.jumpTime / 2)
    expect(s.air).toBeCloseTo(MOVE.jumpHeight, 1)
    command(s, 'jump') // no ar: fica guardado, não pula de novo
    expect(s.action).toBe('jump')
    run(s, MOVE.jumpTime / 2 + 0.02)
    expect(s.air).toBe(0)
    // o pulo guardado só acontece se foi pedido perto da aterrissagem
    expect(s.action === 'land' || s.action === 'run').toBe(true)
  })
  it('pulo pedido logo antes de aterrissar é executado ao tocar o chão', () => {
    const s = createSim(1)
    clearTrack(s)
    command(s, 'jump')
    run(s, MOVE.jumpTime - 0.08)
    command(s, 'jump')
    run(s, 0.12)
    expect(s.action).toBe('jump')
  })
  it('deslize dura o tempo definido e volta a correr', () => {
    const s = createSim(1)
    clearTrack(s)
    command(s, 'slide')
    expect(s.action).toBe('slide')
    command(s, 'slide') // repetir não estende
    run(s, MOVE.slideTime + 0.02)
    expect(s.action).toBe('run')
  })
  it('deslize no ar faz descida rápida e emenda o deslize', () => {
    const s = createSim(1)
    clearTrack(s)
    command(s, 'jump')
    run(s, 0.2)
    command(s, 'slide')
    expect(s.action).toBe('dive')
    run(s, MOVE.diveTime + 0.02)
    expect(s.action).toBe('slide')
    expect(s.air).toBe(0)
  })
  it('curva do pulo é simétrica e não negativa', () => {
    for (let t = 0; t <= MOVE.jumpTime; t += 0.01) expect(jumpCurve(t)).toBeGreaterThanOrEqual(0)
    expect(jumpCurve(0.1)).toBeCloseTo(jumpCurve(MOVE.jumpTime - 0.1))
  })
})

describe('colisões e coleta', () => {
  const withObstacle = (kind: Parameters<typeof laneRequirements>[0][0]['kind'], lane = 1) => {
    const s = createSim(3)
    s.gen.obstacles = [{ id: 1, kind, lane, d: 20, variant: 0 }]
    s.gen.books = []
    s.gen.nextD = 1e9
    return s
  }
  it('bater numa pilha de caixas encerra a partida', () => {
    const s = withObstacle('caixas')
    run(s, 3)
    expect(s.crashed).toBe(true)
    expect(s.crashedBy?.kind).toBe('caixas')
    const d = s.distance
    run(s, 1)
    expect(s.distance).toBe(d) // parou
  })
  it('trocar de faixa evita o obstáculo', () => {
    const s = withObstacle('caixas')
    command(s, 'left')
    run(s, 3)
    expect(s.crashed).toBe(false)
  })
  it('pular passa pela pilha de livros; deslizar não', () => {
    const a = withObstacle('livros')
    while (20 - a.distance > a.speed * 0.3) step(a)
    command(a, 'jump')
    run(a, 2)
    expect(a.crashed).toBe(false)
    const b = withObstacle('livros')
    while (20 - b.distance > b.speed * 0.2) step(b)
    command(b, 'slide')
    run(b, 2)
    expect(b.crashed).toBe(true)
  })
  it('deslizar passa sob a faixa suspensa; pular não', () => {
    const a = withObstacle('faixa')
    while (20 - a.distance > a.speed * 0.2) step(a)
    command(a, 'slide')
    run(a, 2)
    expect(a.crashed).toBe(false)
    const b = withObstacle('faixa')
    while (20 - b.distance > b.speed * 0.3) step(b)
    command(b, 'jump')
    run(b, 2)
    expect(b.crashed).toBe(true)
  })
  it('livro na faixa é coletado uma vez e soma 10 pontos', () => {
    const s = createSim(5)
    clearTrack(s)
    s.gen.books = [{ id: 1, lane: 1, d: 10, y: 1.0, taken: false, color: 0 }, { id: 2, lane: 0, d: 12, y: 1.0, taken: false, color: 0 }]
    run(s, 2)
    expect(s.books).toBe(1)
    expect(scoreOf(s)).toBe(Math.floor(s.distance) + 10)
  })
})

describe('pontuação e dificuldade', () => {
  it('fórmula: metros inteiros + 10 por livro', () => {
    expect(computeScore(123.99, 4)).toBe(163)
    expect(computeScore(0, 0)).toBe(0)
  })
  it('velocidade sobe com o tempo, aos poucos e com teto', () => {
    let prev = speedAt(0)
    for (let t = 0; t < 600; t += 1) {
      const v = speedAt(t)
      expect(v).toBeGreaterThanOrEqual(prev)
      expect(v - prev).toBeLessThan(0.5)
      expect(v).toBeLessThanOrEqual(DIFFICULTY.maxSpeed)
      prev = v
    }
    expect(speedAt(10)).toBe(11)
    expect(speedAt(1000)).toBe(DIFFICULTY.maxSpeed)
  })
  it('reexecutar a semente com o registro de comandos reproduz a partida exatamente', () => {
    const live = createSim(987654)
    const log: [number, Command][] = []
    for (let i = 0; i < 120 * 150 && !live.crashed; i++) {
      botTick(live, log)
      step(live)
    }
    // reexecução (o que o servidor fará na Fase 6): só a semente e os comandos
    const replay = createSim(987654)
    let k = 0
    while (!replay.crashed && replay.tick < live.tick) {
      while (k < log.length && log[k][0] === replay.tick) command(replay, log[k++][1])
      step(replay)
    }
    expect(log.length).toBeGreaterThan(10)
    expect({ score: scoreOf(replay), books: replay.books, tick: replay.tick }).toEqual({ score: scoreOf(live), books: live.books, tick: live.tick })
  })
})

describe('gerador sem padrões impossíveis', () => {
  it('fileira totalmente bloqueada é rejeitada', () => {
    const req = laneRequirements([
      { kind: 'caixas', lane: 0 },
      { kind: 'caixas', lane: 1 },
      { kind: 'carrinho', lane: 2 },
    ])
    expect(rowIsFeasible(['livre', 'livre', 'livre'], req, 5)).toBe(false)
  })
  it('troca de duas faixas sem tempo suficiente é rejeitada', () => {
    const next = laneRequirements([
      { kind: 'caixas', lane: 0 },
      { kind: 'caixas', lane: 1 },
    ])
    expect(rowIsFeasible(['livre', 'bloq', 'bloq'], next, 0.4)).toBe(false)
    expect(rowIsFeasible(['livre', 'bloq', 'bloq'], next, 1.0)).toBe(true)
  })
  it('um jogador automático sobrevive 3 minutos em 300 pistas diferentes', () => {
    const seeds = mulberry32(2026)
    const deaths: string[] = []
    let books = 0
    for (let n = 0; n < 300; n++) {
      const seed = Math.floor(seeds() * 2 ** 31)
      const s = createSim(seed)
      for (let i = 0; i < 120 * 180 && !s.crashed; i++) {
        botTick(s)
        step(s)
      }
      books += s.books
      if (s.crashed) deaths.push(`semente ${seed}: ${s.crashedBy?.kind} aos ${s.time.toFixed(1)} s`)
      // memória estável: a pista guardada não cresce com o tempo
      expect(s.gen.obstacles.length).toBeLessThan(60)
      expect(s.gen.books.length).toBeLessThan(120)
    }
    expect(deaths).toEqual([])
    expect(books / 300).toBeGreaterThan(20)
  }, 120_000)
})
