import type { InputAction, InputContext } from './actions'

const DIRS: Record<string, InputAction> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
}

/** traduz uma tecla para ação, conforme o contexto; null = não é do jogo */
export function keyToAction(code: string, ctx: InputContext): InputAction | null {
  if (ctx === 'text') {
    // digitando o nome: só Enter e Esc são do jogo; o resto vai para o campo
    if (code === 'Enter' || code === 'NumpadEnter') return 'confirm'
    if (code === 'Escape') return 'back'
    return null
  }
  if (DIRS[code]) return DIRS[code]
  if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') return ctx === 'game' && code === 'Space' ? 'up' : 'confirm'
  if (code === 'Escape' || code === 'KeyP') return ctx === 'game' ? 'pause' : 'back'
  if (code === 'Backspace' && ctx === 'menu') return 'back'
  if (code === 'KeyH') return 'help'
  return null
}
