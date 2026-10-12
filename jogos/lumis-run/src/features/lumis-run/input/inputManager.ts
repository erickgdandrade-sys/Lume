import type { InputAction, InputContext, InputDevice, InputListener } from './actions'
import { latchPad, newPadState, padLabel, processPad, snapshot, type PadState } from './gamepad'
import { keyToAction } from './keyboard'
import { classifySwipe } from './touch'

export interface PadInfo {
  connected: boolean
  label: string
}

/**
 * Entrada unificada. Um único laço de requestAnimationFrame lê os controles
 * (criado uma vez, mesmo que o jogo reinicie várias vezes), e teclado e toque
 * entram por eventos. Tudo vira InputAction para quem estiver escutando.
 */
class InputManager {
  private listeners = new Set<InputListener>()
  private pads = new Map<number, PadState>()
  private started = false
  private raf = 0
  context: InputContext = 'menu'
  lastDevice: InputDevice = 'keyboard'
  activePad: number | null = null
  onDeviceChange: ((d: InputDevice) => void) | null = null
  onPadChange: ((p: PadInfo) => void) | null = null

  start() {
    if (this.started || typeof window === 'undefined') return
    this.started = true
    window.addEventListener('keydown', this.onKey, { passive: false })
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true })
    window.addEventListener('pointerup', this.onPointerUp, { passive: true })
    window.addEventListener('touchmove', this.onTouchMove, { passive: false })
    window.addEventListener('gamepadconnected', this.onPadConnected)
    window.addEventListener('gamepaddisconnected', this.onPadDisconnected)
    const loop = () => {
      this.pollPads()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    if (!this.started) return
    this.started = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('touchmove', this.onTouchMove)
    window.removeEventListener('gamepadconnected', this.onPadConnected)
    window.removeEventListener('gamepaddisconnected', this.onPadDisconnected)
  }

  subscribe(fn: InputListener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  setContext(ctx: InputContext) {
    this.context = ctx
  }

  /** chamada a cada troca de tela: botões ainda apertados não valem na tela nova */
  latch() {
    for (const p of this.readPads()) {
      const st = this.pads.get(p.index)
      if (st) latchPad(snapshot(p), st)
    }
  }

  emit(a: InputAction, d: InputDevice) {
    if (d !== this.lastDevice) {
      this.lastDevice = d
      this.onDeviceChange?.(d)
    }
    for (const l of [...this.listeners]) l(a, d)
  }

  rumble(ms = 220) {
    if (this.activePad == null) return
    const p = this.readPads().find((g) => g.index === this.activePad)
    const act = (p as unknown as { vibrationActuator?: { playEffect?: (t: string, o: object) => Promise<unknown> } })?.vibrationActuator
    act?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: 0.6, weakMagnitude: 0.4 })?.catch(() => {})
  }

  private readPads(): Gamepad[] {
    try {
      return (navigator.getGamepads?.() ?? []).filter((p): p is Gamepad => !!p && p.connected)
    } catch {
      return []
    }
  }

  private pollPads() {
    const pads = this.readPads()
    // detecta controles que aparecem sem evento (alguns navegadores só os expõem após um botão)
    for (const p of pads) {
      if (!this.pads.has(p.index)) {
        const st = newPadState()
        latchPad(snapshot(p), st)
        this.pads.set(p.index, st)
        this.publishPad()
      }
    }
    for (const p of pads) {
      const st = this.pads.get(p.index)!
      const actions = processPad(snapshot(p), st, this.context !== 'game')
      if (actions.length) {
        this.activePad = p.index
        for (const a of actions) this.emit(a, 'gamepad')
      }
    }
  }

  private publishPad() {
    const pads = this.readPads()
    const p = pads.find((g) => g.index === this.activePad) ?? pads[0]
    this.onPadChange?.({ connected: pads.length > 0, label: p ? padLabel(p.id) : '' })
  }

  private onPadConnected = (e: GamepadEvent) => {
    if (!this.pads.has(e.gamepad.index)) {
      const st = newPadState()
      latchPad(snapshot(e.gamepad), st)
      this.pads.set(e.gamepad.index, st)
    }
    this.publishPad()
  }

  private onPadDisconnected = (e: GamepadEvent) => {
    this.pads.delete(e.gamepad.index)
    const wasActive = this.activePad === e.gamepad.index
    if (wasActive) this.activePad = null
    this.publishPad()
    // o controle em uso caiu: o jogo pausa em vez de registrar derrota
    if (wasActive && this.lastDevice === 'gamepad') for (const l of [...this.listeners]) l('disconnect', 'gamepad')
  }

  private onKey = (e: KeyboardEvent) => {
    const a = keyToAction(e.code, this.context)
    if (!a) return
    // setas e espaço não rolam a página
    e.preventDefault()
    if (e.repeat) return
    this.emit(a, 'keyboard')
  }

  private touchStart: { x: number; y: number; t: number; id: number } | null = null

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    if (this.context !== 'game') {
      if (this.lastDevice !== 'touch') {
        this.lastDevice = 'touch'
        this.onDeviceChange?.('touch')
      }
      return
    }
    this.touchStart = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }
  }

  private onPointerUp = (e: PointerEvent) => {
    const s = this.touchStart
    if (!s || s.id !== e.pointerId || this.context !== 'game') return
    this.touchStart = null
    const a = classifySwipe(e.clientX - s.x, e.clientY - s.y, performance.now() - s.t)
    if (a) this.emit(a, 'touch')
  }

  private onTouchMove = (e: TouchEvent) => {
    // impede rolagem e zoom por gesto durante a corrida
    if (this.context === 'game') e.preventDefault()
  }
}

export const input = new InputManager()
