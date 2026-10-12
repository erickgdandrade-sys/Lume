import { useRef } from 'react'
import { sound } from '../../audio/sound'
import { session } from '../../session'
import { Avatar } from '../Avatar'
import { BookIcon, Hint } from '../bits'
import { fmt, useMenuNav, useRanking, useSound } from '../useInput'

export function MenuScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const byScore = useRanking('pontos').slice(0, 3)
  const byBooks = useRanking('livros').slice(0, 3)
  useMenuNav(ref)
  useSound()
  return (
    <div className="lr-screen lr-left" ref={ref}>
      <div className="lr-card lr-menu-card">
        <p className="lr-eyebrow">Lume apresenta</p>
        <h1 className="lr-title">
          Lumis <span>Run</span> 3D
        </h1>
        <p className="lr-sub">Corra pela escola, desvie dos obstáculos e colete livros. No fim, coloque seu nome e entre nos rankings.</p>
        <div className="lr-actions">
          <button className="lr-cta" data-nav onClick={() => session.start()}>
            <Hint pad="A" kb="Enter" /> JOGAR
          </button>
          <button className="lr-btn" data-nav onClick={() => session.go('ranking')}>
            Ver rankings
          </button>
        </div>
        {byScore.length > 0 && (
          <div className="lr-mini-ranks">
            <MiniList title="Mais pontos" items={byScore.map((e) => ({ id: e.id, name: e.name, value: fmt(e.score) }))} />
            <MiniList title="Mais livros" icon items={byBooks.map((e) => ({ id: e.id, name: e.name, value: fmt(e.bestBooks) }))} />
          </div>
        )}
        {sound.locked && !sound.prefs.muted && <p className="lr-sound-hint">🔈 Clique ou aperte uma tecla para ligar a música</p>}
        <p className="lr-hint">
          Jogue com controle, teclado ou toque ·{' '}
          <button className="lr-link lr-link-inline" onClick={() => session.start(true)}>
            modo demonstração
          </button>
        </p>
      </div>
    </div>
  )
}

function MiniList({ title, items, icon }: { title: string; items: { id: string; name: string; value: string }[]; icon?: boolean }) {
  return (
    <div>
      <p className="lr-mini-title">{title}</p>
      <ol className="lr-mini-rank" aria-label={title}>
        {items.map((e, i) => (
          <li key={e.id} className={i === 0 ? 'is-first' : ''}>
            <span className="lr-pos">{i + 1}º</span>
            <span className="lr-name">
              <Avatar id={e.id} name={e.name} size={22} />
              {e.name}
            </span>
            <span className="lr-pts">
              {icon && <BookIcon />}
              {e.value}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
