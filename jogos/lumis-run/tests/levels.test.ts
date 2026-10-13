import { describe, expect, it } from 'vitest'
import { bookRulesAt } from '../src/features/lumis-run/config/difficulty'
import { CORRIDOR } from '../src/features/lumis-run/config/gameConfig'
import {
  levelAtDistance,
  levelStart,
  SCENARIO_COUNT,
  SCENARIO_NAMES,
  scenarioOfLevel,
  TRANSITION,
  visualLevelAt,
  visualStart,
} from '../src/features/lumis-run/core/levels'
import type { Obstacle } from '../src/features/lumis-run/core/obstacles'
import { createSim, step } from '../src/features/lumis-run/core/sim'
import { SCENARIOS } from '../src/features/lumis-run/render/scenery'
import { botTick } from './bot'

const L = CORRIDOR.segmentLength

describe('níveis e cenários', () => {
  it('cada nível começa depois do anterior e a distância volta ao nível certo', () => {
    for (let n = 1; n < 30; n++) {
      expect(levelStart(n + 1)).toBeGreaterThan(levelStart(n))
      expect(levelAtDistance(levelStart(n))).toBe(n)
      expect(levelAtDistance(levelStart(n + 1) - 0.01)).toBe(n)
    }
  })

  it('são 10 cenários, o 10º no nível 10, e depois eles se repetem', () => {
    expect(SCENARIOS).toHaveLength(SCENARIO_COUNT)
    expect(SCENARIOS.map((s) => s.name)).toEqual([...SCENARIO_NAMES])
    expect(scenarioOfLevel(1)).toBe(0)
    expect(scenarioOfLevel(10)).toBe(9)
    expect(scenarioOfLevel(11)).toBe(0)
    expect(scenarioOfLevel(23)).toBe(2)
  })

  it('a janela no cenário fica no primeiro segmento a partir do início do nível', () => {
    for (const offset of [0, 7.3, 31.9]) {
      for (let n = 2; n < 25; n++) {
        const v = visualStart(n, offset)
        expect(v % L).toBeCloseTo(0, 6)
        expect(v).toBeGreaterThanOrEqual(levelStart(n) + offset - 1e-6)
        expect(v).toBeLessThan(levelStart(n) + offset + L)
        expect(visualLevelAt(v, offset)).toBe(n)
        expect(visualLevelAt(v - L, offset)).toBe(n - 1)
      }
    }
  })
})

describe('pista nas transições e livros', () => {
  it('não há obstáculos enquanto a Lumis pula a janela e acena', () => {
    for (const seed of [11, 202, 3003]) {
      const s = createSim(seed)
      const seen = new Map<number, Obstacle>()
      const speedAtStart = new Map<number, number>()
      for (let i = 0; i < 120 * 150 && !s.crashed; i++) {
        botTick(s)
        step(s)
        for (const o of s.gen.obstacles) seen.set(o.id, o)
        const n = levelAtDistance(s.distance)
        if (!speedAtStart.has(n)) speedAtStart.set(n, s.speed)
      }
      expect(speedAtStart.size).toBeGreaterThan(3)
      for (const [n, v] of speedAtStart) {
        if (n < 2) continue
        const b = levelStart(n)
        const from = b + TRANSITION.leapStart * v - 4
        const to = b + TRANSITION.greetEnd * v + 5
        const inside = [...seen.values()].filter((o) => o.d > from && o.d < to)
        expect(inside, `semente ${seed}, nível ${n}`).toEqual([])
      }
    }
  })

  it('pegar livros fica mais difícil a cada faixa de níveis', () => {
    const rules = [1, 3, 5, 8].map(bookRulesAt)
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i].chance).toBeLessThan(rules[i - 1].chance)
      expect(rules[i].maxLine).toBeLessThanOrEqual(rules[i - 1].maxLine)
      expect(rules[i].risky).toBeGreaterThan(rules[i - 1].risky)
    }
  })
})
