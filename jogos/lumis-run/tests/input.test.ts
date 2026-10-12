import { describe, expect, it } from 'vitest'
import { axisStep, latchPad, newPadState, processPad, STANDARD, type PadSnapshot } from '../src/features/lumis-run/input/gamepad'
import { keyToAction } from '../src/features/lumis-run/input/keyboard'
import { classifySwipe } from '../src/features/lumis-run/input/touch'

const pad = (pressed: number[] = [], axes: number[] = [0, 0, 0, 0], mapping = 'standard'): PadSnapshot => {
  const buttons = Array.from({ length: 17 }, (_, i) => pressed.includes(i))
  return { index: 0, id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)', mapping, buttons, axes }
}

describe('controle Xbox', () => {
  it('A, B, Menu e View geram uma ação por toque (borda), não por quadro', () => {
    const st = newPadState()
    expect(processPad(pad([STANDARD.A]), st, false)).toEqual(['confirm'])
    // segurando A por vários quadros: nada novo
    for (let i = 0; i < 30; i++) expect(processPad(pad([STANDARD.A]), st, false)).toEqual([])
    expect(processPad(pad([]), st, false)).toEqual([])
    expect(processPad(pad([STANDARD.A]), st, false)).toEqual(['confirm'])
    expect(processPad(pad([STANDARD.B]), st, false)).toEqual(['back'])
    expect(processPad(pad([STANDARD.MENU]), st, false)).toEqual(['pause'])
    expect(processPad(pad([STANDARD.VIEW]), st, false)).toEqual(['help'])
  })
  it('D-pad troca de faixa', () => {
    const st = newPadState()
    expect(processPad(pad([STANDARD.LEFT]), st, false)).toEqual(['left'])
    expect(processPad(pad([]), st, false)).toEqual([])
    expect(processPad(pad([STANDARD.RIGHT]), st, false)).toEqual(['right'])
  })
  it('analógico: zona morta ignora leves toques', () => {
    expect(axisStep(0.2, 0)).toEqual({ state: 0, fired: 0 })
    expect(axisStep(-0.5, 0)).toEqual({ state: 0, fired: 0 })
  })
  it('analógico inclinado e parado troca uma faixa só', () => {
    const st = newPadState()
    const fired: string[] = []
    for (let i = 0; i < 120; i++) fired.push(...processPad(pad([], [-0.95, 0]), st, false))
    expect(fired).toEqual(['left'])
  })
  it('precisa voltar perto do centro para trocar de novo (histerese)', () => {
    const st = newPadState()
    const seq = [-0.9, -0.5, -0.9, -0.3, -0.9] // -0.5 não rearma; -0.3 rearma
    const out = seq.flatMap((x) => processPad(pad([], [x, 0]), st, false))
    expect(out).toEqual(['left', 'left'])
  })
  it('virar o analógico direto para o outro lado troca imediatamente', () => {
    const st = newPadState()
    const out = [-0.9, 0.9].flatMap((x) => processPad(pad([], [x, 0]), st, false))
    expect(out).toEqual(['left', 'right'])
  })
  it('eixo vertical só navega nos menus (não pula sem querer na corrida)', () => {
    expect(processPad(pad([], [0, -0.9]), newPadState(), false)).toEqual([])
    expect(processPad(pad([], [0, -0.9]), newPadState(), true)).toEqual(['up'])
  })
  it('troca de tela: botão ainda apertado não vale na tela nova', () => {
    const st = newPadState()
    processPad(pad([STANDARD.A]), st, false) // A confirmou "Jogar"
    latchPad(pad([STANDARD.A]), st)
    expect(processPad(pad([STANDARD.A]), st, false)).toEqual([])
    expect(processPad(pad([]), st, false)).toEqual([])
    expect(processPad(pad([STANDARD.A]), st, false)).toEqual(['confirm'])
  })
  it('controle com mapeamento não padrão (D-pad como eixo)', () => {
    const st = newPadState()
    const axes = [0, 0, 0, 0, 0, 0, -1, 0]
    expect(processPad(pad([0], axes, ''), st, false)).toEqual(['confirm', 'left'])
    expect(processPad(pad([7], [0, 0, 0, 0, 0, 0, 0, 0], ''), st, false)).toEqual(['pause'])
  })
  it('resultado não depende de quantos quadros por segundo são lidos', () => {
    // 30 vs 144 leituras durante o mesmo segundo com o analógico inclinado
    for (const reads of [30, 144]) {
      const st = newPadState()
      let n = 0
      for (let i = 0; i < reads; i++) n += processPad(pad([], [0.9, 0]), st, false).length
      expect(n).toBe(1)
    }
  })
})

describe('teclado', () => {
  it('na corrida: setas/WASD movem, espaço pula, Esc pausa', () => {
    expect(keyToAction('ArrowLeft', 'game')).toBe('left')
    expect(keyToAction('KeyD', 'game')).toBe('right')
    expect(keyToAction('Space', 'game')).toBe('up')
    expect(keyToAction('KeyS', 'game')).toBe('down')
    expect(keyToAction('Escape', 'game')).toBe('pause')
  })
  it('nos menus: Enter confirma, Esc volta', () => {
    expect(keyToAction('Enter', 'menu')).toBe('confirm')
    expect(keyToAction('Escape', 'menu')).toBe('back')
  })
  it('digitando o nome, letras e setas ficam com o campo', () => {
    expect(keyToAction('KeyA', 'text')).toBe(null)
    expect(keyToAction('ArrowLeft', 'text')).toBe(null)
    expect(keyToAction('Enter', 'text')).toBe('confirm')
  })
})

describe('toque', () => {
  it('gestos nas quatro direções', () => {
    expect(classifySwipe(-80, 5, 150)).toBe('left')
    expect(classifySwipe(80, -10, 150)).toBe('right')
    expect(classifySwipe(4, -90, 150)).toBe('up')
    expect(classifySwipe(4, 90, 150)).toBe('down')
  })
  it('toque curto ou arrasto lento não contam', () => {
    expect(classifySwipe(10, 5, 100)).toBe(null)
    expect(classifySwipe(100, 0, 900)).toBe(null)
  })
})
