import type { InputAction } from './actions'

/**
 * Leitura de controles Xbox (One e Series X|S, USB ou Bluetooth) pela
 * Gamepad API nativa. O módulo é independente do jogo: transforma o estado
 * bruto do controle em ações, com detecção de borda (um comando por toque),
 * zona morta e histerese no analógico (inclinado e parado = uma troca só).
 */
export const STICK = {
  deadzone: 0.25,
  press: 0.6, // cruzou este limite: dispara
  release: 0.35, // precisa voltar abaixo deste para disparar de novo
} as const

// Mapeamento "standard" do W3C, usado pelo Chrome/Edge com controles Xbox.
export const STANDARD = { A: 0, B: 1, X: 2, Y: 3, VIEW: 8, MENU: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const
// Alguns navegadores (ex.: Firefox no Linux/macOS via Bluetooth) não informam "standard".
export const FALLBACK = { A: 0, B: 1, X: 2, Y: 3, VIEW: 6, MENU: 7, hatX: 6, hatY: 7 } as const

export interface PadSnapshot {
  index: number
  id: string
  mapping: string
  buttons: boolean[]
  axes: number[]
}

export interface PadState {
  buttons: boolean[] // estado anterior, para borda
  latched: Set<number> // botões ignorados até serem soltos (troca de tela)
  stickX: -1 | 0 | 1
  stickY: -1 | 0 | 1
  hatX: -1 | 0 | 1
  hatY: -1 | 0 | 1
}

export const newPadState = (): PadState => ({ buttons: [], latched: new Set(), stickX: 0, stickY: 0, hatX: 0, hatY: 0 })

export function snapshot(p: Gamepad): PadSnapshot {
  return {
    index: p.index,
    id: p.id,
    mapping: p.mapping,
    buttons: p.buttons.map((b) => b.pressed || b.value > 0.5),
    axes: [...p.axes],
  }
}

/** histerese de um eixo: devolve o novo estado e se houve disparo */
export function axisStep(value: number, state: -1 | 0 | 1): { state: -1 | 0 | 1; fired: -1 | 0 | 1 } {
  const v = Math.abs(value) < STICK.deadzone ? 0 : value
  if (state === 0) {
    if (v <= -STICK.press) return { state: -1, fired: -1 }
    if (v >= STICK.press) return { state: 1, fired: 1 }
    return { state: 0, fired: 0 }
  }
  // já inclinado: só rearma ao voltar para perto do centro
  if (Math.abs(v) < STICK.release) return { state: 0, fired: 0 }
  // inverteu direto para o outro lado
  if (state === -1 && v >= STICK.press) return { state: 1, fired: 1 }
  if (state === 1 && v <= -STICK.press) return { state: -1, fired: -1 }
  return { state, fired: 0 }
}

/**
 * Processa um quadro de um controle. `vertical` liga o eixo Y do analógico
 * (só nos menus, para não pular sem querer durante a corrida).
 */
export function processPad(snap: PadSnapshot, st: PadState, vertical: boolean): InputAction[] {
  const out: InputAction[] = []
  const std = snap.mapping === 'standard'
  const map = std ? STANDARD : FALLBACK
  const pressed = (i: number) => !!snap.buttons[i]
  const edge = (i: number) => {
    const now = pressed(i)
    const was = !!st.buttons[i]
    if (!now) st.latched.delete(i)
    return now && !was && !st.latched.has(i)
  }
  const buttonActions: [number, InputAction][] = [
    [map.A, 'confirm'],
    [map.B, 'back'],
    [map.MENU, 'pause'],
    [map.VIEW, 'help'],
  ]
  if (std) {
    buttonActions.push([STANDARD.LEFT, 'left'], [STANDARD.RIGHT, 'right'], [STANDARD.UP, 'up'], [STANDARD.DOWN, 'down'])
  }
  for (const [i, a] of buttonActions) if (edge(i)) out.push(a)

  // D-pad como eixo (mapeamento não padrão)
  if (!std && snap.axes.length > FALLBACK.hatY) {
    const hx = axisStep(snap.axes[FALLBACK.hatX], st.hatX)
    st.hatX = hx.state
    if (hx.fired) out.push(hx.fired < 0 ? 'left' : 'right')
    const hy = axisStep(snap.axes[FALLBACK.hatY], st.hatY)
    st.hatY = hy.state
    if (hy.fired) out.push(hy.fired < 0 ? 'up' : 'down')
  }

  // analógico esquerdo
  const sx = axisStep(snap.axes[0] ?? 0, st.stickX)
  st.stickX = sx.state
  if (sx.fired) out.push(sx.fired < 0 ? 'left' : 'right')
  const sy = axisStep(snap.axes[1] ?? 0, st.stickY)
  st.stickY = sy.state
  if (sy.fired && vertical) out.push(sy.fired < 0 ? 'up' : 'down')

  st.buttons = snap.buttons.slice()
  return out
}

/** ignora tudo o que está pressionado agora até ser solto */
export function latchPad(snap: PadSnapshot, st: PadState) {
  snap.buttons.forEach((b, i) => b && st.latched.add(i))
  st.buttons = snap.buttons.slice()
  // analógico inclinado também precisa voltar ao centro
  const x = snap.axes[0] ?? 0
  const y = snap.axes[1] ?? 0
  st.stickX = Math.abs(x) >= STICK.release ? (x < 0 ? -1 : 1) : 0
  st.stickY = Math.abs(y) >= STICK.release ? (y < 0 ? -1 : 1) : 0
}

/** nome curto e amigável do controle */
export function padLabel(id: string) {
  const s = id.toLowerCase()
  if (s.includes('xbox') || s.includes('xinput') || s.includes('045e')) return 'Controle Xbox'
  return 'Controle'
}
