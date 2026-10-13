import { cleanName, nameKey } from './names'
import { phoneDigits } from './phone'

/**
 * Dois rankings do evento, por jogador (nome + WhatsApp):
 *  - pontos: a melhor pontuação da pessoa (desempate: distância, livros, menor duração)
 *  - livros: a partida em que ela pegou mais livros (desempate: menor duração, mais pontos)
 * Cada ranking guarda a melhor partida dela naquele critério.
 *
 * O WhatsApp fica só no registro privado. O que vai para a tela passa por
 * publicEntry(), que não leva o telefone.
 *
 * LocalRankingStore guarda no navegador da máquina (modo sem servidor). Com o
 * ranking online configurado, store.ts usa o servidor (validação por reexecução).
 */
export interface RunResult {
  name: string
  phone: string
  score: number
  distance: number
  books: number
  durationMs: number
  seed: number
}

export interface RunStats {
  score: number
  distance: number
  books: number
  durationMs: number
  seed: number
  at: number
}

/** registro privado (tem o telefone) */
export interface PlayerRecord {
  key: string
  name: string
  phone: string
  best: RunStats
  bestBooks: RunStats
  runs: number
  firstAt: number
  lastAt: number
}

/** o que pode aparecer na tela */
export interface PublicEntry {
  id: string
  name: string
  score: number
  distance: number
  books: number
  bestBooks: number
  /** ranking online: duração da melhor partida em pontos e na de mais livros (desempates) */
  durationMs?: number
  booksMs?: number
  rawDistance?: number
  /** ranking online: endereço público da foto, se a pessoa autorizou */
  photo?: string
}

export interface SubmitOutcome {
  entry: PublicEntry
  posScore: number // 1 = primeiro
  posBooks: number
  improvedScore: boolean
  improvedBooks: boolean
  previousBest: number | null
  previousBooks: number | null
  /** ranking online: ok = no ranking; analise = aguardando a equipe; pendente = sem internet, será enviado; recusada = não validou */
  status?: 'ok' | 'analise' | 'pendente' | 'recusada'
}

export interface RankingStore {
  byScore(): PublicEntry[]
  byBooks(): PublicEntry[]
  /** jogador com o mesmo nome e o mesmo WhatsApp, se existir */
  findPlayer(name: string, phone: string): PublicEntry | undefined
  /** posições que essa partida teria se fosse salva agora */
  preview(run: Omit<RunResult, 'name' | 'phone'>, name?: string, phone?: string): { posScore: number; posBooks: number }
  submit(r: RunResult): SubmitOutcome
  /** só para o painel da equipe */
  privateList(): PlayerRecord[]
  clear(): void
  subscribe(cb: () => void): () => void
}

type Stats = Pick<RunStats, 'score' | 'distance' | 'books' | 'durationMs'> & { at?: number }

export function compareScore(a: Stats, b: Stats) {
  return b.score - a.score || b.distance - a.distance || b.books - a.books || a.durationMs - b.durationMs || (a.at ?? 0) - (b.at ?? 0)
}

export function compareBooks(a: Stats, b: Stats) {
  return b.books - a.books || a.durationMs - b.durationMs || b.score - a.score || (a.at ?? 0) - (b.at ?? 0)
}

export function playerKey(name: string, phone: string) {
  return `${nameKey(name)}|${phoneDigits(phone)}`
}

/** id público do jogador (nome + WhatsApp), usado também para a foto */
export function playerPublicId(name: string, phone: string) {
  return publicId(playerKey(name, phone))
}

/** id público estável que não revela o telefone */
function publicId(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36)
}

export function publicEntry(p: PlayerRecord): PublicEntry {
  return { id: publicId(p.key), name: p.name, score: p.best.score, distance: Math.floor(p.best.distance), books: p.best.books, bestBooks: p.bestBooks.books, durationMs: p.best.durationMs, booksMs: p.bestBooks.durationMs, rawDistance: p.best.distance }
}

const sortScore = (list: PlayerRecord[]) => list.slice().sort((a, b) => compareScore(a.best, b.best))
const sortBooks = (list: PlayerRecord[]) => list.slice().sort((a, b) => compareBooks(a.bestBooks, b.bestBooks))

export function mergeResult(players: PlayerRecord[], r: RunResult, now: number): { players: PlayerRecord[]; outcome: SubmitOutcome } {
  const key = playerKey(r.name, r.phone)
  const list = players.slice()
  const i = list.findIndex((p) => p.key === key)
  const prev = i >= 0 ? list[i] : undefined
  const run: RunStats = { score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, seed: r.seed, at: now }
  const improvedScore = !prev || compareScore(run, prev.best) < 0
  const improvedBooks = !prev || compareBooks(run, prev.bestBooks) < 0
  const rec: PlayerRecord = {
    key,
    name: improvedScore || !prev ? cleanName(r.name) : prev.name,
    phone: phoneDigits(r.phone),
    best: improvedScore ? run : prev!.best,
    bestBooks: improvedBooks ? run : prev!.bestBooks,
    runs: (prev?.runs ?? 0) + 1,
    firstAt: prev?.firstAt ?? now,
    lastAt: now,
  }
  if (i >= 0) list[i] = rec
  else list.push(rec)
  return {
    players: list,
    outcome: {
      entry: publicEntry(rec),
      posScore: sortScore(list).indexOf(rec) + 1,
      posBooks: sortBooks(list).indexOf(rec) + 1,
      improvedScore,
      improvedBooks,
      previousBest: prev?.best.score ?? null,
      previousBooks: prev?.bestBooks.books ?? null,
    },
  }
}

export function previewPositions(players: PlayerRecord[], run: Omit<RunResult, 'name' | 'phone'>, name = '', phone = '') {
  const { outcome } = mergeResult(players, { ...run, name: name || '\u0000', phone: phone || '\u0000' }, Number.MAX_SAFE_INTEGER)
  return { posScore: outcome.posScore, posBooks: outcome.posBooks }
}

/** CSV para a equipe (abre no Excel em pt-BR: separador ;) */
export function toCsv(players: PlayerRecord[]) {
  const head = ['pos_pontos', 'pos_livros', 'nome', 'whatsapp', 'pontos', 'livros_na_melhor', 'mais_livros', 'distancia_m', 'partidas', 'ultima_partida']
  const byS = sortScore(players)
  const byB = sortBooks(players)
  const esc = (v: string | number) => {
    const s = String(v)
    // evita fórmula no Excel e escapa aspas
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
    return /[;"\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const rows = byS.map((p) => [byS.indexOf(p) + 1, byB.indexOf(p) + 1, p.name, `+55${p.phone}`, p.best.score, p.best.books, p.bestBooks.books, Math.floor(p.best.distance), p.runs, new Date(p.lastAt).toLocaleString('pt-BR')])
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
}

function isRecord(p: unknown): p is PlayerRecord {
  const x = p as PlayerRecord
  return !!x && typeof x.key === 'string' && typeof x.name === 'string' && typeof x.phone === 'string' && typeof x.best?.score === 'number' && typeof x.bestBooks?.books === 'number'
}

const KEY = 'lumis-run:ranking:v2'

export class LocalRankingStore implements RankingStore {
  private players: PlayerRecord[] = []
  private scoreCache: PublicEntry[] = []
  private booksCache: PublicEntry[] = []
  private subs = new Set<() => void>()

  constructor() {
    this.load()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === KEY) {
          this.load()
          this.notify()
        }
      })
    }
  }

  private load() {
    try {
      const raw = localStorage.getItem(KEY)
      const data = raw ? JSON.parse(raw) : []
      this.players = Array.isArray(data) ? data.filter(isRecord) : []
    } catch {
      this.players = []
    }
    this.refresh()
  }

  private refresh() {
    this.scoreCache = sortScore(this.players).map(publicEntry)
    this.booksCache = sortBooks(this.players).map(publicEntry)
  }

  private write() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.players))
    } catch {
      // armazenamento indisponível: o ranking continua valendo nesta sessão
    }
  }

  private notify() {
    for (const s of [...this.subs]) s()
  }

  byScore() {
    return this.scoreCache
  }

  byBooks() {
    return this.booksCache
  }

  findPlayer(name: string, phone: string) {
    const k = playerKey(name, phone)
    const p = this.players.find((x) => x.key === k)
    return p && publicEntry(p)
  }

  preview(run: Omit<RunResult, 'name' | 'phone'>, name?: string, phone?: string) {
    return previewPositions(this.players, run, name, phone)
  }

  submit(r: RunResult) {
    const { players, outcome } = mergeResult(this.players, r, Date.now())
    this.players = players
    this.refresh()
    this.write()
    this.notify()
    return outcome
  }

  privateList() {
    return sortScore(this.players)
  }

  clear() {
    this.players = []
    this.refresh()
    this.write()
    this.notify()
  }

  subscribe(cb: () => void) {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }
}
