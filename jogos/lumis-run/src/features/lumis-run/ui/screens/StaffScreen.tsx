import { useState, useSyncExternalStore } from 'react'
import { photos } from '../../ranking/photos'
import { compareBooks, playerPublicId, ranking, toCsv } from '../../ranking/ranking'
import { Avatar } from '../Avatar'
import { formatPhone, whatsappLink } from '../../ranking/phone'
import { isPublicBase, setShareBase, shareBase } from '../../share/storyData'
import { session } from '../../session'
import { fmt, useInputAction } from '../useInput'

/**
 * Área da equipe: contatos de quem está no ranking, para entregar os prêmios.
 * O PIN só evita que um visitante abra a lista por acidente na máquina do stand;
 * os dados ficam neste navegador (na Fase 6, numa tabela privada do Supabase).
 */
const PIN_KEY = 'lumis-run:pin-equipe'
const DEFAULT_PIN = '2026'

function getPin() {
  try {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN
  } catch {
    return DEFAULT_PIN
  }
}

export function StaffScreen() {
  const [ok, setOk] = useState(false)
  useInputAction((a) => {
    if (a === 'back') session.go('ranking')
  })
  return ok ? <StaffPanel /> : <PinGate onOk={() => setOk(true)} />
}

function PinGate({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const check = () => (pin === getPin() ? onOk() : (setErr(true), setPin('')))
  useInputAction((a) => {
    if (a === 'confirm') check()
  })
  return (
    <div className="lr-screen lr-center">
      <form
        className="lr-card lr-pin-card"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <p className="lr-eyebrow">Área da equipe</p>
        <h2 className="lr-h2">Digite o PIN</h2>
        <label className="lr-field">
          <span className="lr-sr">PIN</span>
          <input id="lr-pin" type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => (setErr(false), setPin(e.target.value))} />
        </label>
        {err && <p className="lr-error" role="alert">PIN incorreto.</p>}
        <div className="lr-actions">
          <button type="submit" className="lr-cta">
            Entrar
          </button>
          <button type="button" className="lr-btn" onClick={() => session.go('ranking')}>
            Voltar
          </button>
        </div>
      </form>
    </div>
  )
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function StaffPanel() {
  // redesenha quando o ranking muda
  useSyncExternalStore((cb) => ranking.subscribe(cb), () => ranking.byScore(), () => ranking.byScore())
  const list = ranking.privateList()
  const booksOrder = list.slice().sort((a, b) => compareBooks(a.bestBooks, b.bestBooks)).map((p) => p.key)
  const [base, setBase] = useState(() => shareBase())
  const [newPin, setNewPin] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(0)
  const flash = (t: string) => {
    setMsg(t)
    setTimeout(() => setMsg(null), 3500)
  }
  const csv = () => toCsv(list)
  const date = new Date().toISOString().slice(0, 10)

  return (
    <div className="lr-screen lr-center">
      <div className="lr-card lr-staff-card">
        <div className="lr-rank-head">
          <div>
            <p className="lr-eyebrow">Área da equipe</p>
            <h2 className="lr-h2">Contatos do ranking</h2>
          </div>
          <button className="lr-btn" onClick={() => session.go('ranking')}>
            Fechar
          </button>
        </div>
        <p className="lr-note-text">
          {list.length} {list.length === 1 ? 'jogador' : 'jogadores'}. Os telefones só aparecem aqui. Use só para combinar a entrega dos prêmios.
        </p>
        <div className="lr-staff-table-wrap">
          <table className="lr-staff-table">
            <thead>
              <tr>
                <th>Pontos</th>
                <th>Livros</th>
                <th>Foto</th>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>Melhor pontuação</th>
                <th>Mais livros</th>
                <th>Partidas</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => {
                const bpos = booksOrder.indexOf(p.key) + 1
                return (
                  <tr key={p.key}>
                    <td>{i + 1}º</td>
                    <td>{bpos}º</td>
                    <td>
                      <Avatar id={playerPublicId(p.name, p.phone)} name={p.name} size={40} />
                    </td>
                    <td>{p.name}</td>
                    <td>
                      <a href={whatsappLink(p.phone)} target="_blank" rel="noreferrer">
                        {formatPhone(p.phone)}
                      </a>
                    </td>
                    <td>{fmt(p.best.score)}</td>
                    <td>{p.bestBooks.books}</td>
                    <td>{p.runs}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="lr-actions">
          <button className="lr-cta" disabled={!list.length} onClick={() => download(`lumis-run-contatos-${date}.csv`, csv())}>
            Baixar planilha (CSV)
          </button>
          <button
            className="lr-btn"
            disabled={!list.length}
            onClick={() =>
              navigator.clipboard
                ?.writeText(csv())
                .then(() => flash('Planilha copiada. Cole no Excel ou no Google Planilhas.'))
                .catch(() => flash('Não foi possível copiar neste navegador.'))
            }
          >
            Copiar planilha
          </button>
        </div>
        {msg && <p className="lr-note-text" role="status">{msg}</p>}

        <h3 className="lr-staff-h3">Endereço público do jogo (para o QR code)</h3>
        <p className="lr-note-text">O QR leva o celular do visitante para este endereço com a arte. Precisa ser https e acessível pela internet, por exemplo o endereço do jogo no site da Lume.</p>
        <div className="lr-inline-form">
          <input className="lr-input" value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://lume.com.br/lumis-run" />
          <button
            className="lr-btn"
            onClick={() => {
              setShareBase(base)
              setBase(shareBase())
              flash(isPublicBase(shareBase()) ? 'Endereço salvo.' : 'Salvo, mas esse endereço não é público (precisa de https).')
            }}
          >
            Salvar
          </button>
        </div>
        {!isPublicBase(base) && <p className="lr-warn lr-small">Este endereço não abre no celular do visitante.</p>}

        <h3 className="lr-staff-h3">Segurança</h3>
        <div className="lr-inline-form">
          <input className="lr-input" type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="Novo PIN (4 a 8 dígitos)" />
          <button
            className="lr-btn"
            onClick={() => {
              if (!/^\d{4,8}$/.test(newPin)) return flash('Use de 4 a 8 dígitos.')
              try {
                localStorage.setItem(PIN_KEY, newPin)
                flash('PIN trocado.')
              } catch {
                flash('Não foi possível salvar o PIN.')
              }
              setNewPin('')
            }}
          >
            Trocar PIN
          </button>
          <button
            className="lr-btn lr-danger"
            disabled={!list.length}
            onClick={() => {
              if (confirmClear === 0) return setConfirmClear(1)
              ranking.clear()
              void photos.clear()
              setConfirmClear(0)
              flash('Ranking, contatos e fotos apagados.')
            }}
          >
            {confirmClear ? 'Confirmar: apagar tudo' : 'Apagar ranking, contatos e fotos'}
          </button>
        </div>
      </div>
    </div>
  )
}
