import { describe, expect, it } from 'vitest'
import { STEPS, TRACKS } from '../src/features/lumis-run/audio/music'
import { computePose, overlayTwirl, overlayWave, TWIRL_TIME, WAVE_TIME } from '../src/features/lumis-run/render/lumisPose'

describe('música', () => {
  for (const [name, tr] of Object.entries(TRACKS)) {
    it(`trilha ${name}: laço de 4 compassos completo e notas válidas`, () => {
      expect(tr.chords).toHaveLength(4)
      expect(tr.bass).toHaveLength(STEPS)
      for (const lead of tr.lead) expect(lead).toHaveLength(STEPS)
      expect(tr.drums.length).toBe(STEPS)
      expect(tr.drums).toMatch(/^[kshlo.]+$/)
      const notes = [...tr.bass, ...tr.lead.flat(), ...tr.chords.flat()].filter((n): n is number => n != null)
      for (const n of notes) expect(n >= 24 && n <= 100).toBe(true)
    })
  }
})

describe('novas animações da Lumis', () => {
  it('na contagem ela olha para a câmera, dá tchau e vira para correr', () => {
    const start = computePose('greet', 1, 1)
    expect(Math.abs(start.ry)).toBeLessThan(0.5) // de frente para a câmera
    const waves = [0.5, 0.8, 1.1, 1.4, 1.7].map((t) => computePose('greet', t, t).wave)
    expect(Math.max(...waves) - Math.min(...waves)).toBeGreaterThan(0.4) // a ponta balança
    const end = computePose('greet', 3, 3)
    expect(end.ry).toBeCloseTo(Math.PI, 2) // de costas, pronta para correr
    expect(end.wave).toBeCloseTo(0, 6)
  })
  it('ao passar de nível: vira, dá tchau e volta exatamente à corrida', () => {
    const mid = overlayWave(computePose('run', 0, 5), WAVE_TIME / 2)
    expect(Math.abs(mid.ry - 0.22)).toBeLessThan(0.05)
    expect(Math.abs(mid.wave)).toBeGreaterThan(0)
    const run = computePose('run', 0, 7)
    const after = overlayWave(computePose('run', 0, 7), WAVE_TIME)
    expect(after.ry).toBeCloseTo(run.ry, 5)
    expect(after.wave).toBeCloseTo(0, 6)
  })
  it('giro do recorde termina na mesma direção da corrida', () => {
    const run = computePose('run', 0, 2)
    const end = overlayTwirl(computePose('run', 0, 2), TWIRL_TIME)
    expect(end.ry - run.ry).toBeCloseTo(Math.PI * 2, 5)
    expect(end.y).toBeCloseTo(run.y, 5)
  })
  it('no menu ela acena de tempos em tempos e para', () => {
    const waving = [5.8, 6.2, 6.6, 7.0].some((t) => Math.abs(computePose('menu', 0, t).wave) > 0.1)
    expect(waving).toBe(true)
    expect(computePose("menu", 0, 2).wave).toBeCloseTo(0, 6)
  })
})
