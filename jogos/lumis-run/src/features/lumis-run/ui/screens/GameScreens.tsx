import { useEffect, useRef, useState } from 'react'
import { session } from '../../session'
import { BookIcon, ControlsHint, GamepadIcon, Hint } from '../bits'
import { sound } from '../../audio/sound'
import { QrCode } from '../../share/qr'
import { Avatar } from '../Avatar'
import { drawStory, storyBlob } from '../../share/storyArt'
import { isPublicBase, shareBase, storyUrl, type StoryData } from '../../share/storyData'
import type { PublicEntry } from '../../ranking/ranking'
import { fmt, fmtTime, useMenuNav, useRanking, useSound } from '../useInput'
import { useUi } from '../uiStore'

export function Hud() {
  const hud = useUi((s) => s.hud)
  const record = useUi((s) => s.record)
  const demo = useUi((s) => s.demo)
  const [banner, setBanner] = useState<number | null>(null)
  const lastLevel = useRef(hud.level)
  useEffect(() => {
    if (hud.level > lastLevel.current) {
      setBanner(hud.level)
      const id = setTimeout(() => setBanner(null), 1800)
      lastLevel.current = hud.level
      return () => clearTimeout(id)
    }
    lastLevel.current = hud.level
  }, [hud.level])
  return (
    <>
      {banner && (
        <div className="lr-level-banner" key={banner} role="status">
          Nível {banner}!<span>mais rápido</span>
        </div>
      )}
      <div className="lr-hud" aria-live="off">
        <div className="lr-score">
          <span className="lr-score-num">{fmt(hud.score)}</span>
          <span className="lr-score-label">pontos</span>
        </div>
        <div className="lr-hud-chips">
          <span className="lr-chip">
            <BookIcon /> {hud.books}
          </span>
          <span className="lr-chip lr-mono">{fmtTime(hud.time)}</span>
          <span className="lr-chip" title="Nível de velocidade">Nível {hud.level}</span>
          {record != null && !demo && <span className={`lr-chip${hud.score > record ? ' lr-chip-gold' : ''}`}>Recorde {fmt(Math.max(record, hud.score))}</span>}
          {demo && <span className="lr-chip">Demonstração</span>}
        </div>
      </div>
      <div className="lr-side">
        <ControlsHint />
      </div>
      <button className="lr-pause-btn" aria-label="Pausar" onClick={() => session.pause('jogador')}>
        ❚❚
      </button>
    </>
  )
}

export function Countdown() {
  const n = useUi((s) => s.countdown)
  const player = useUi((s) => s.player)
  const demo = useUi((s) => s.demo)
  return (
    <>
      <div className="lr-side">
        <ControlsHint />
      </div>
      <div className="lr-countdown">
        <p>{demo ? 'Modo demonstração' : player ? `Prepare-se, ${player.name}!` : 'Prepare-se!'}</p>
        <span key={n} className="lr-count-num">
          {n > 0 ? n : 'Já!'}
        </span>
      </div>
    </>
  )
}

export function PauseScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const reason = useUi((s) => s.pauseReason)
  useSound()
  useMenuNav(ref, { onBack: () => session.resume() })
  return (
    <div className="lr-screen lr-center" ref={ref}>
      <div className="lr-card lr-pause-card">
        <h2 className="lr-h2">Pausado</h2>
        {reason === 'controle' && <p className="lr-warn">O controle foi desconectado. Reconecte ou continue pelo teclado. A partida não foi perdida.</p>}
        {reason === 'aba' && <p className="lr-note-text">O jogo pausou porque a janela saiu de foco.</p>}
        <div className="lr-actions lr-col">
          <button className="lr-cta" data-nav onClick={() => session.resume()}>
            <Hint pad="A" kb="Enter" /> Continuar
          </button>
          <button className="lr-btn" data-nav onClick={() => session.restart()}>
            Reiniciar
          </button>
          <button className="lr-btn" data-nav onClick={() => sound.setMusic(!sound.prefs.music)}>
            Música: {sound.prefs.music ? 'ligada' : 'desligada'}
          </button>
          <button className="lr-btn" data-nav onClick={() => session.toMenu()}>
            Voltar ao menu
          </button>
        </div>
      </div>
    </div>
  )
}


const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function Stats({ time, books, distance }: { time: number; books: number; distance: number }) {
  return (
    <dl className="lr-stats">
      <div>
        <dt>Tempo</dt>
        <dd>{fmtTime(time)}</dd>
      </div>
      <div>
        <dt>Livros</dt>
        <dd>{books}</dd>
      </div>
      <div>
        <dt>Distância</dt>
        <dd>{fmt(distance)} m</dd>
      </div>
    </dl>
  )
}

/** fim da partida: resultado, posição que a pessoa teria e o convite para o cadastro */
export function GameOverScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const r = useUi((s) => s.result)
  const player = useUi((s) => s.player)
  useMenuNav(ref, { onBack: () => session.toMenu() })
  if (!r) return null
  const p = r.preview
  return (
    <div className="lr-screen lr-left" ref={ref}>
      <div className="lr-card lr-over-card">
        <p className="lr-eyebrow">Fim de corrida</p>
        {p?.posScore === 1 && <p className="lr-badge lr-badge-gold">1º lugar em pontos!</p>}
        {p?.posBooks === 1 && <p className="lr-badge lr-badge-gold">1º lugar em livros!</p>}
        <div className="lr-final">
          <span className="lr-final-num">{fmt(r.score)}</span>
          <span className="lr-score-label">pontos</span>
        </div>
        <Stats time={r.time} books={r.books} distance={r.distance} />
        {r.demo ? (
          <>
            <p className="lr-note-text">Partida de demonstração: não entra no ranking.</p>
            <div className="lr-actions">
              <button className="lr-cta" data-nav onClick={() => session.restart()}>
                <Hint pad="A" kb="Enter" /> Jogar de novo
              </button>
              <button className="lr-btn" data-nav onClick={() => session.toMenu()}>
                <Hint pad="B" kb="Esc" /> Menu
              </button>
            </div>
          </>
        ) : (
          <>
            {p && (
              <p className="lr-rank-preview">
                Com essa partida você fica em <strong>{p.posScore}º em pontos</strong> e <strong>{p.posBooks}º em livros</strong>.
              </p>
            )}
            <div className="lr-actions lr-col">
              {player ? (
                <>
                  <button className="lr-cta" data-nav onClick={() => session.register(player.name, player.phone)}>
                    <Hint pad="A" kb="Enter" /> Salvar como {player.name}
                  </button>
                  <button className="lr-btn" data-nav onClick={() => session.go('nome')}>
                    Não sou {player.name}
                  </button>
                </>
              ) : (
                <button className="lr-cta" data-nav onClick={() => session.go('nome')}>
                  <Hint pad="A" kb="Enter" /> Entrar no ranking
                </button>
              )}
              <div className="lr-actions">
                <button className="lr-btn" data-nav onClick={() => session.skipRegister()}>
                  Só a arte, sem ranking
                </button>
                <button className="lr-btn" data-nav onClick={() => session.toMenu()}>
                  <Hint pad="B" kb="Esc" /> Sair sem salvar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** imagem da arte dos stories (prévia na tela do jogo) */
function StoryPreview({ data }: { data: StoryData }) {
  const [url, setUrl] = useState<string | null>(null)
  const key = JSON.stringify(data)
  useEffect(() => {
    let u = ''
    let alive = true
    const c = document.createElement('canvas')
    void drawStory(c, data)
      .then(storyBlob)
      .then((b) => {
        if (!alive) return
        u = URL.createObjectURL(b)
        setUrl(u)
      })
      .catch(() => {})
    return () => {
      alive = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [key])
  return <div className="lr-story-preview">{url ? <img src={url} alt="Prévia da arte para os stories" /> : <span>Gerando a arte…</span>}</div>
}

/** depois do cadastro: posição nos dois rankings, a arte e o QR para os stories */
export function ShareScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const r = useUi((s) => s.result)
  useMenuNav(ref, { onBack: () => session.toMenu() })
  if (!r) return null
  const o = r.outcome
  const data: StoryData = { name: o?.entry.name ?? '', score: r.score, books: r.books, distance: r.distance, posScore: o?.posScore ?? null, posBooks: o?.posBooks ?? null }
  const base = shareBase()
  const url = storyUrl(data, base)
  const pub = isPublicBase(base)
  return (
    <div className="lr-screen lr-center" ref={ref}>
      <div className="lr-card lr-share-card">
        <div className="lr-share-info">
          <p className="lr-eyebrow">{o ? 'Você está no ranking' : 'Sua arte está pronta'}</p>
          {o && (
            <>
              <h2 className="lr-h2 lr-with-avatar">
                <Avatar id={o.entry.id} name={o.entry.name} size={52} />
                {o.entry.name}, sua posição:
              </h2>
              <div className="lr-places">
                <div className={o.posScore === 1 ? 'is-gold' : ''}>
                  <strong>{o.posScore}º</strong>
                  <span>em pontos</span>
                </div>
                <div className={o.posBooks === 1 ? 'is-gold' : ''}>
                  <strong>{o.posBooks}º</strong>
                  <span>em livros</span>
                </div>
              </div>
              {o.previousBest != null && !o.improvedScore && <p className="lr-note-text">Vale o seu melhor: {fmt(o.entry.score)} pontos e {plural(o.entry.bestBooks, 'livro', 'livros')}.</p>}
              {o.previousBest != null && o.improvedScore && <p className="lr-badge">Novo recorde pessoal!</p>}
            </>
          )}
          <div className="lr-qr-box">
            <QrCode value={url} size={170} label="QR code da arte para os stories" />
            <p>
              <strong>Aponte a câmera do celular</strong> para o QR e poste sua arte nos stories do Instagram.
            </p>
          </div>
          {!pub && <p className="lr-warn lr-small">O QR só abre no celular quando o jogo estiver publicado num endereço https. A equipe configura isso na área da equipe.</p>}
          <div className="lr-actions">
            <button className="lr-cta" data-nav onClick={() => session.restart()}>
              <Hint pad="A" kb="Enter" /> Jogar de novo
            </button>
            <button className="lr-btn" data-nav onClick={() => session.go('ranking')}>
              Ver rankings
            </button>
            <button className="lr-btn" data-nav onClick={() => session.toMenu()}>
              <Hint pad="B" kb="Esc" /> Próximo jogador
            </button>
          </div>
        </div>
        <StoryPreview data={data} />
      </div>
    </div>
  )
}

function RankList({ title, items, value, mine }: { title: string; items: PublicEntry[]; value: (e: PublicEntry) => React.ReactNode; mine?: string }) {
  return (
    <section className="lr-rank-col">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="lr-note-text">Ninguém ainda. Seja o primeiro!</p>
      ) : (
        <ol className="lr-rank">
          {items.map((e, i) => (
            <li key={e.id} className={`${i === 0 ? 'is-first' : ''}${e.id === mine ? ' is-me' : ''}`}>
              <span className="lr-pos">{i + 1}º</span>
              <span className="lr-name">
                <Avatar id={e.id} name={e.name} size={30} />
                {e.name}
              </span>
              <span className="lr-pts">{value(e)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function RankingScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const byScore = useRanking('pontos').slice(0, 10)
  const byBooks = useRanking('livros').slice(0, 10)
  const result = useUi((s) => s.result)
  const back = () => session.go(!result ? 'menu' : result.outcome || result.skipped ? 'compartilhar' : 'fim')
  useMenuNav(ref, { onBack: back })
  const mine = result?.outcome?.entry.id
  return (
    <div className="lr-screen lr-center" ref={ref}>
      <div className="lr-card lr-rank-card">
        <div className="lr-rank-head">
          <div>
            <p className="lr-eyebrow">South Tech Summit</p>
            <h2 className="lr-h2">Rankings</h2>
          </div>
        </div>
        <div className="lr-rank-cols">
          <RankList title="Mais pontos" items={byScore} mine={mine} value={(e) => fmt(e.score)} />
          <RankList
            title="Mais livros"
            items={byBooks}
            mine={mine}
            value={(e) => (
              <>
                <BookIcon /> {e.bestBooks}
              </>
            )}
          />
        </div>
        <div className="lr-actions lr-spread">
          <button className="lr-btn" data-nav onClick={back}>
            <Hint pad="B" kb="Esc" /> Voltar
          </button>
          <button className="lr-link" onClick={() => session.go('equipe')}>
            Área da equipe
          </button>
        </div>
      </div>
    </div>
  )
}

export function PadChip() {
  const pad = useUi((s) => s.pad)
  if (!pad.connected) return null
  return (
    <span className="lr-chip lr-chip-pad" title="Controle conectado">
      <GamepadIcon /> {pad.label} conectado
    </span>
  )
}
