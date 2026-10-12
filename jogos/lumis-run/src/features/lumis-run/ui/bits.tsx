import { useUi } from './uiStore'

/** botão do controle Xbox com a cor oficial de cada letra */
export function PadKey({ k }: { k: 'A' | 'B' | 'X' | 'Y' | 'Menu' | 'View' }) {
  return <span className={`lr-pad lr-pad-${k}`}>{k === 'Menu' ? '☰' : k === 'View' ? '⧉' : k}</span>
}

/** rótulo de atalho conforme o último dispositivo usado */
export function Hint({ pad, kb }: { pad: 'A' | 'B' | 'Menu' | 'View'; kb: string }) {
  const device = useUi((s) => s.device)
  if (device === 'gamepad') return <PadKey k={pad} />
  if (device === 'touch') return null
  return <kbd className="lr-kbd">{kb}</kbd>
}

export function GamepadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 6h9c2.6 0 4.6 2 5 4.6l.9 5.6c.3 1.8-1.1 3.4-2.9 3.4-1 0-1.9-.5-2.4-1.3L15.8 16H8.2l-1.3 2.3c-.5.8-1.4 1.3-2.4 1.3-1.8 0-3.2-1.6-2.9-3.4l.9-5.6C2.9 8 4.9 6 7.5 6Zm-.5 3v1.5H5.5V12H7v1.5h1.5V12H10v-1.5H8.5V9H7Zm9.8.4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-2 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      />
    </svg>
  )
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M5 3.5h11.5A2.5 2.5 0 0 1 19 6v13.5H6.5A1.5 1.5 0 0 0 5 21V3.5Zm2 2V16h10V6a.5.5 0 0 0-.5-.5H7Z" />
    </svg>
  )
}

/** instruções de controle, simples, adaptadas ao dispositivo */
export function ControlsHint() {
  const device = useUi((s) => s.device)
  const rows: [React.ReactNode, string][] =
    device === 'gamepad'
      ? [
          [<span className="lr-glyph">◀ ▶</span>, 'Trocar de faixa'],
          [<PadKey k="A" />, 'Pular'],
          [<PadKey k="B" />, 'Deslizar'],
          [<PadKey k="Menu" />, 'Pausar'],
        ]
      : device === 'touch'
        ? [
            [<span className="lr-glyph">⇠ ⇢</span>, 'Deslize para trocar de faixa'],
            [<span className="lr-glyph">⇡</span>, 'Deslize para cima: pular'],
            [<span className="lr-glyph">⇣</span>, 'Deslize para baixo: deslizar'],
          ]
        : [
            [<span className="lr-keys"><kbd className="lr-kbd">←</kbd><kbd className="lr-kbd">→</kbd></span>, 'Trocar de faixa'],
            [<kbd className="lr-kbd">↑</kbd>, 'Pular'],
            [<kbd className="lr-kbd">↓</kbd>, 'Deslizar'],
            [<kbd className="lr-kbd">Esc</kbd>, 'Pausar'],
          ]
  return (
    <ul className="lr-controls" aria-label="Controles">
      {rows.map(([k, label], i) => (
        <li key={i}>
          <span className="lr-controls-key">{k}</span>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  )
}
