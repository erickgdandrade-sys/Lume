import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { InputAction } from '../input/actions'
import { sound } from '../audio/sound'
import { input } from '../input/inputManager'
import { ranking } from '../ranking/store'

/** escuta ações enquanto o componente estiver montado */
export function useInputAction(fn: (a: InputAction) => void, enabled = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!enabled) return
    return input.subscribe((a) => ref.current(a))
  }, [enabled])
}

/**
 * Navegação de menu por controle e teclado: setas/D-pad/analógico movem o
 * foco entre os elementos [data-nav] do contêiner; A/Enter confirma; B/Esc volta.
 */
export function useMenuNav(container: React.RefObject<HTMLElement | null>, opts: { onBack?: () => void; enabled?: boolean; autoFocus?: boolean } = {}) {
  const { onBack, enabled = true, autoFocus = true } = opts
  useEffect(() => {
    if (!enabled || !autoFocus) return
    const first = container.current?.querySelector<HTMLElement>('[data-nav]')
    first?.focus({ preventScroll: true })
  }, [enabled, autoFocus, container])

  useInputAction((a) => {
    const root = container.current
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>('[data-nav]')].filter((el) => !el.hasAttribute('disabled'))
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (a === 'up' || a === 'left') {
      items[(i <= 0 ? items.length : i) - 1].focus({ preventScroll: true })
      sound.play('tick')
    } else if (a === 'down' || a === 'right') {
      items[(i + 1) % items.length].focus({ preventScroll: true })
      sound.play('tick')
    }
    else if (a === 'confirm') (i >= 0 ? items[i] : items[0]).click()
    else if (a === 'back') onBack?.()
  }, enabled)
}

/** ranking público (sem telefone): 'pontos' ou 'livros' */
export function useRanking(kind: 'pontos' | 'livros' = 'pontos') {
  const get = kind === 'pontos' ? () => ranking.byScore() : () => ranking.byBooks()
  return useSyncExternalStore((cb) => ranking.subscribe(cb), get, get)
}

/** estado da conexão do ranking online e partidas guardadas sem internet */
export function useConnection() {
  const get = () => `${ranking.connection()}|${ranking.pending()}`
  const v = useSyncExternalStore((cb) => ranking.subscribe(cb), get, get)
  const [conn, pending] = v.split('|')
  return { conn: conn as ReturnType<typeof ranking.connection>, pending: Number(pending), online: ranking.online }
}

export const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR')
export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

/** redesenha quando as preferências ou o estado do som mudam */
export function useSound() {
  return useSyncExternalStore(
    (cb) => sound.subscribe(cb),
    () => `${sound.prefs.muted}|${sound.prefs.music}|${sound.locked}`,
    () => '',
  )
}
