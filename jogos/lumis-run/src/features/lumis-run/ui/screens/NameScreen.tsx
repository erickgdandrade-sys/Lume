import { useEffect, useRef, useState } from 'react'
import { ranking } from '../../ranking/ranking'
import { cleanName, NAME_ERROR_TEXT, NAME_LIMITS, validateName } from '../../ranking/names'
import { formatPhone, PHONE_ERROR_TEXT, validatePhone } from '../../ranking/phone'
import { sound } from '../../audio/sound'
import { session } from '../../session'
import { Hint, PadKey } from '../bits'
import { PhotoStep } from './PhotoStep'
import { fmt, useInputAction, useMenuNav } from '../useInput'
import { useUi } from '../uiStore'

const LETTERS = [...['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZÇÃÕ-', 'ÁÉÍÓÚÂÊÔ.\''].map((r) => r.split('')), ['ESPAÇO', 'APAGAR', 'PRONTO']]
const DIGITS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['APAGAR', '0', 'PRONTO']]
const PHONE_MAX = 13 // com 55 na frente

type Field = 'nome' | 'whats'

/** teclado na tela para digitar com o controle */
function PadKeyboard({ rows, onKey, onDone, onBack, doneLabel }: { rows: string[][]; onKey: (k: string) => void; onDone: () => void; onBack: () => void; doneLabel: string }) {
  const [pos, setPos] = useState({ r: 0, c: 0 })
  useInputAction((a) => {
    if (a === 'up' || a === 'down' || a === 'left' || a === 'right') sound.play('tick')
    if (a === 'confirm') sound.play('click')
    setPos((p) => {
      const r = rows.length
      if (a === 'up') return { r: (p.r - 1 + r) % r, c: Math.min(p.c, rows[(p.r - 1 + r) % r].length - 1) }
      if (a === 'down') return { r: (p.r + 1) % r, c: Math.min(p.c, rows[(p.r + 1) % r].length - 1) }
      if (a === 'left') return { r: p.r, c: (p.c - 1 + rows[p.r].length) % rows[p.r].length }
      if (a === 'right') return { r: p.r, c: (p.c + 1) % rows[p.r].length }
      return p
    })
    if (a === 'confirm') {
      const k = rows[pos.r][pos.c]
      if (k === 'ESPAÇO') onKey(' ')
      else if (k === 'APAGAR') onKey('\b')
      else if (k === 'PRONTO') onDone()
      else onKey(k)
    } else if (a === 'back') onBack()
    else if (a === 'pause') onDone()
  })
  return (
    <div className={`lr-osk${rows === DIGITS ? ' is-digits' : ''}`} aria-hidden="true">
      {rows.map((row, r) => (
        <div key={r} className="lr-osk-row">
          {row.map((k, c) => (
            <span key={k} className={`lr-osk-key${r === pos.r && c === pos.c ? ' is-on' : ''}${k.length > 1 ? ' is-wide' : ''}`}>
              {k === 'PRONTO' ? doneLabel : k}
            </span>
          ))}
        </div>
      ))}
      <p className="lr-osk-help">
        <PadKey k="A" /> escolher · <PadKey k="B" /> apagar · <PadKey k="Menu" /> {doneLabel.toLowerCase()}
      </p>
    </div>
  )
}

function ConfirmDuplicate({ name, score, books, onYes, onNo }: { name: string; score: number; books: number; onYes: () => void; onNo: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useMenuNav(ref, { onBack: onNo })
  return (
    <div className="lr-dialog" role="alertdialog" aria-labelledby="dup-title" ref={ref}>
      <h2 id="dup-title">Esse nome já está no jogo</h2>
      <p>
        <strong>{name}</strong>, com esse WhatsApp, já está no ranking com <strong>{fmt(score)} pontos</strong> e <strong>{books} {books === 1 ? 'livro' : 'livros'}</strong>. Se continuar, vale o melhor resultado em cada ranking.
      </p>
      <div className="lr-actions">
        <button className="lr-cta" data-nav onClick={onYes}>
          <Hint pad="A" kb="Enter" /> Continuar
        </button>
        <button className="lr-btn" data-nav onClick={onNo}>
          <Hint pad="B" kb="Esc" /> Corrigir os dados
        </button>
      </div>
    </div>
  )
}

/** cadastro no fim da partida: nome (público) e WhatsApp (privado) */
export function NameScreen() {
  const device = useUi((s) => s.device)
  const result = useUi((s) => s.result)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('') // só dígitos
  const [field, setField] = useState<Field>('nome')
  const [error, setError] = useState<{ field: Field; text: string } | null>(null)
  const [dup, setDup] = useState<{ name: string; score: number; books: number } | null>(null)
  const [photoFor, setPhotoFor] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const sent = useRef(false)
  const pad = device === 'gamepad'

  useEffect(() => {
    if (pad || dup || photoFor) return
    ;(field === 'nome' ? nameRef : phoneRef).current?.focus()
  }, [pad, dup, field, photoFor])

  const checkName = () => {
    const err = validateName(name)
    if (err) {
      sound.play('error')
      setError({ field: 'nome', text: NAME_ERROR_TEXT[err] })
      setField('nome')
      return false
    }
    return true
  }

  // dados conferidos: segue para a foto (opcional) e então grava
  const save = (n: string) => {
    setDup(null)
    setPhotoFor(n)
  }

  const register = (photo: string | null) => {
    if (sent.current || !photoFor) return
    sent.current = true
    session.register(photoFor, phone, photo)
  }

  const submit = () => {
    if (!checkName()) return
    const perr = validatePhone(phone)
    if (perr) {
      sound.play('error')
      setError({ field: 'whats', text: PHONE_ERROR_TEXT[perr] })
      setField('whats')
      return
    }
    const n = cleanName(name)
    // aviso só quando nome E WhatsApp já estão no ranking (é a mesma pessoa jogando de novo)
    const existing = ranking.findPlayer(n, phone)
    if (existing) return setDup({ name: existing.name, score: existing.score, books: existing.bestBooks })
    save(n)
  }

  const next = () => {
    if (field === 'nome') {
      if (checkName()) setField('whats')
    } else submit()
  }

  const back = () => (field === 'whats' ? setField('nome') : session.go('fim'))

  // Enter/Esc do teclado físico (o controle usa o teclado na tela)
  useInputAction((a) => {
    if (dup || pad || photoFor) return
    if (a === 'confirm') next()
    if (a === 'back') session.go('fim')
  }, !dup && !photoFor)

  const onKey = (k: string) => {
    setError(null)
    if (field === 'nome') setName((v) => (k === '\b' ? v.slice(0, -1) : (v + k).slice(0, NAME_LIMITS.max)))
    else setPhone((v) => (k === '\b' ? v.slice(0, -1) : (v + k).slice(0, PHONE_MAX)))
  }

  const phoneShown = formatPhone(phone) || phone
  if (!result) return null
  if (photoFor) {
    return (
      <div className="lr-screen lr-left">
        <PhotoStep name={photoFor} onDone={register} onBack={() => setPhotoFor(null)} />
      </div>
    )
  }

  return (
    <div className="lr-screen lr-left">
      <form
        className="lr-card lr-name-card"
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <p className="lr-eyebrow">Entrar no ranking</p>
        <h2 className="lr-h2">
          {fmt(result.score)} pontos e {result.books} {result.books === 1 ? 'livro' : 'livros'}!
        </h2>
        <label className={`lr-field${pad && field === 'nome' ? ' is-active' : ''}`}>
          <span className="lr-field-label">Seu nome</span>
          <input
            id="lr-nome"
            ref={nameRef}
            value={name}
            maxLength={NAME_LIMITS.max}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="next"
            placeholder="Ex.: Ana Souza"
            readOnly={pad}
            onFocus={() => setField('nome')}
            onChange={(e) => {
              setError(null)
              setName(e.target.value)
            }}
          />
          <span className="lr-count">
            {name.length}/{NAME_LIMITS.max}
          </span>
        </label>
        {error?.field === 'nome' && <p className="lr-error" role="alert">{error.text}</p>}
        <label className={`lr-field${pad && field === 'whats' ? ' is-active' : ''}`}>
          <span className="lr-field-label">WhatsApp com DDD</span>
          <input
            id="lr-whats"
            ref={phoneRef}
            type="tel"
            inputMode="numeric"
            value={phoneShown}
            autoComplete="tel-national"
            enterKeyHint="done"
            placeholder="(48) 99999-1234"
            readOnly={pad}
            onFocus={() => setField('whats')}
            onChange={(e) => {
              setError(null)
              let d = e.target.value.replace(/\D/g, '')
              // apagou só a pontuação da máscara: apaga o dígito anterior
              if (d === phone && e.target.value.length < phoneShown.length) d = d.slice(0, -1)
              setPhone(d.slice(0, PHONE_MAX))
            }}
          />
        </label>
        {error?.field === 'whats' && <p className="lr-error" role="alert">{error.text}</p>}
        <p className="lr-note-text">Só o nome aparece no ranking. O WhatsApp fica com a equipe da Lume, só para avisar quem ganhar o prêmio.</p>
        {pad && !dup ? (
          <PadKeyboard
            key={field}
            rows={field === 'nome' ? LETTERS : DIGITS}
            doneLabel={field === 'nome' ? 'PRÓXIMO' : 'SALVAR'}
            onKey={onKey}
            onDone={next}
            onBack={() => ((field === 'nome' ? name : phone) ? onKey('\b') : back())}
          />
        ) : pad ? null : (
          <div className="lr-actions">
            <button type="submit" className="lr-cta">
              <Hint pad="A" kb="Enter" /> {field === 'nome' ? 'Próximo' : 'Salvar no ranking'}
            </button>
            <button type="button" className="lr-btn" onClick={() => session.go('fim')}>
              <Hint pad="B" kb="Esc" /> Voltar
            </button>
          </div>
        )}
      </form>
      {dup && (
        <div className="lr-backdrop">
          <ConfirmDuplicate
            name={dup.name}
            score={dup.score}
            books={dup.books}
            onYes={() => save(dup.name)}
            onNo={() => {
              setDup(null)
              setField('nome')
            }}
          />
        </div>
      )}
    </div>
  )
}

