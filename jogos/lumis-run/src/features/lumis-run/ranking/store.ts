import type { Command } from '../core/sim'
import { boardPreview, type Board } from './board'
import { cleanName } from './names'
import { LocalRankingStore, playerPublicId, type PublicEntry, type RunResult, type SubmitOutcome } from './ranking'

/**
 * Ranking usado pelo jogo. Duas implementações com a mesma interface:
 *  - online (VITE_LUMIS_API definido): o servidor reexecuta a partida e guarda o
 *    ranking único que aparece em todos os aparelhos;
 *  - local: tudo no navegador da máquina (arquivo aberto do disco, prévia).
 */
export interface RunSubmission extends RunResult {
  commands: [number, Command][]
  /** bilhete do servidor que deu a semente (null = partida sem bilhete) */
  token: string | null
  /** foto 256×256 (data URL JPEG), só com autorização */
  photo: string | null
}

export type Connection = 'local' | 'online' | 'offline'

export interface RankingApi {
  readonly online: boolean
  byScore(): PublicEntry[]
  byBooks(): PublicEntry[]
  connection(): Connection
  /** partidas esperando internet para serem enviadas */
  pending(): number
  findPlayer(name: string, phone: string): Promise<PublicEntry | undefined>
  preview(run: Omit<RunResult, 'name' | 'phone'>, name?: string, phone?: string): { posScore: number; posBooks: number }
  submit(r: RunSubmission): Promise<SubmitOutcome>
  /** semente da próxima partida oficial (pedida ao servidor antes, para funcionar mesmo sem internet na hora) */
  takeTicket(): { token: string; seed: number } | null
  refresh(): Promise<void>
  subscribe(cb: () => void): () => void
}

class LocalApi implements RankingApi {
  readonly online = false
  private store = new LocalRankingStore()
  byScore = () => this.store.byScore()
  byBooks = () => this.store.byBooks()
  connection = (): Connection => 'local'
  pending = () => 0
  findPlayer = async (n: string, p: string) => this.store.findPlayer(n, p)
  preview = (run: Omit<RunResult, 'name' | 'phone'>, n?: string, p?: string) => this.store.preview(run, n, p)
  submit = async (r: RunSubmission) => this.store.submit({ name: r.name, phone: r.phone, score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, seed: r.seed })
  takeTicket = () => null
  refresh = async () => {}
  subscribe = (cb: () => void) => this.store.subscribe(cb)
  /** área da equipe no modo local */
  get local() {
    return this.store
  }
}

const K_BOARD = 'lumis-run:ranking-online'
const K_TICKETS = 'lumis-run:bilhetes'
const K_QUEUE = 'lumis-run:fila'
const TICKET_TTL = 20 * 3600e3
const POOL = 2

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // sem armazenamento: segue só na memória
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code)
  }
}

export class OnlineApi implements RankingApi {
  readonly online = true
  private board: Board = { byScore: [], byBooks: [] }
  private conn: Connection = 'offline'
  private tickets: { token: string; seed: number; at: number }[] = []
  private queue: RunSubmission[] = []
  private subs = new Set<() => void>()
  private busy = { tickets: false, queue: false }

  constructor(
    private base: string,
    private fetcher: typeof fetch = (...a) => fetch(...a),
  ) {
    const b = read<Board | null>(K_BOARD, null)
    if (b && Array.isArray(b.byScore) && Array.isArray(b.byBooks)) this.board = b
    this.tickets = read<typeof this.tickets>(K_TICKETS, []).filter((t) => Date.now() - t.at < TICKET_TTL)
    this.queue = read<RunSubmission[]>(K_QUEUE, [])
  }

  /** começa a sincronizar: ranking a cada 15 s, bilhetes e fila */
  start() {
    void this.tick()
    if (typeof window === 'undefined') return
    setInterval(() => {
      if (!document.hidden) void this.tick()
    }, 15000)
    window.addEventListener('online', () => void this.tick())
  }

  private async tick() {
    await this.refresh()
    await this.flush()
    await this.fillTickets()
  }

  private notify() {
    for (const s of [...this.subs]) s()
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown, timeout = 8000): Promise<T> {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeout)
    try {
      const res = await this.fetcher(this.base.replace(/\/$/, '') + path, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctl.signal,
      })
      const data = (await res.json().catch(() => ({}))) as T & { error?: string; detail?: string }
      if (!res.ok) throw new ApiError(res.status, data.detail ?? data.error ?? 'erro')
      this.setConn('online')
      return data
    } catch (e) {
      if (!(e instanceof ApiError) || e.status >= 500) this.setConn('offline')
      throw e
    } finally {
      clearTimeout(timer)
    }
  }

  private setConn(c: Connection) {
    if (c !== this.conn) {
      this.conn = c
      this.notify()
    }
  }

  private setBoard(b: Board) {
    this.board = b
    write(K_BOARD, b)
    this.notify()
  }

  byScore = () => this.board.byScore
  byBooks = () => this.board.byBooks
  connection = () => this.conn
  pending = () => this.queue.length

  async refresh() {
    try {
      this.setBoard(await this.call<Board>('GET', '/ranking'))
    } catch {
      // sem internet: continua mostrando o último ranking recebido
    }
  }

  async fillTickets() {
    if (this.busy.tickets) return
    this.busy.tickets = true
    try {
      while (this.tickets.length < POOL) {
        const t = await this.call<{ token: string; seed: number }>('POST', '/bilhete')
        this.tickets.push({ ...t, at: Date.now() })
        write(K_TICKETS, this.tickets)
      }
    } catch {
      // tenta de novo no próximo ciclo
    } finally {
      this.busy.tickets = false
    }
  }

  takeTicket() {
    this.tickets = this.tickets.filter((t) => Date.now() - t.at < TICKET_TTL)
    const t = this.tickets.shift() ?? null
    write(K_TICKETS, this.tickets)
    void this.fillTickets()
    return t && { token: t.token, seed: t.seed }
  }

  async findPlayer(name: string, phone: string) {
    try {
      const r = await this.call<{ entry: PublicEntry | null }>('POST', '/jogador', { name, phone }, 5000)
      return r.entry ?? undefined
    } catch {
      const id = playerPublicId(name, phone)
      return this.board.byScore.find((e) => e.id === id)
    }
  }

  preview(run: Omit<RunResult, 'name' | 'phone'>, name?: string, phone?: string) {
    return boardPreview(this.board, run, name && phone ? playerPublicId(name, phone) : undefined)
  }

  private body(r: RunSubmission) {
    return { token: r.token, seed: r.seed, commands: r.commands, name: r.name, phone: r.phone, photo: r.photo, claimed: { score: r.score, books: r.books }, version: __LUMIS_VERSION__ }
  }

  async submit(r: RunSubmission): Promise<SubmitOutcome> {
    try {
      // sem rede no aparelho: nem tenta, guarda direto
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline')
      const res = await this.call<{ outcome: SubmitOutcome; board: Board }>('POST', '/partida', this.body(r), 8000)
      this.setBoard(res.board)
      return res.outcome
    } catch (e) {
      if (e instanceof ApiError && e.status < 500) {
        // o servidor recusou a partida (bilhete usado, reexecução diferente...)
        const entry: PublicEntry = { id: playerPublicId(r.name, r.phone), name: cleanName(r.name), score: r.score, distance: Math.floor(r.distance), books: r.books, bestBooks: r.books }
        return { entry, posScore: 0, posBooks: 0, improvedScore: false, improvedBooks: false, previousBest: null, previousBooks: null, status: 'recusada' }
      }
      // sem internet: guarda e envia quando a conexão voltar
      this.queue.push(r)
      write(K_QUEUE, this.queue)
      this.notify()
      const id = playerPublicId(r.name, r.phone)
      const prev = this.board.byScore.find((e) => e.id === id)
      const pos = this.preview(r, r.name, r.phone)
      const entry: PublicEntry = { id, name: cleanName(r.name), score: Math.max(r.score, prev?.score ?? 0), distance: Math.floor(r.distance), books: r.books, bestBooks: Math.max(r.books, prev?.bestBooks ?? 0) }
      return { entry, ...pos, improvedScore: !prev || r.score > prev.score, improvedBooks: !prev || r.books > prev.bestBooks, previousBest: prev?.score ?? null, previousBooks: prev?.bestBooks ?? null, status: 'pendente' }
    }
  }

  /** envia a fila de partidas guardadas sem internet */
  async flush() {
    if (this.busy.queue || !this.queue.length) return
    this.busy.queue = true
    try {
      while (this.queue.length) {
        try {
          const res = await this.call<{ board: Board }>('POST', '/partida', this.body(this.queue[0]), 12000)
          this.setBoard(res.board)
        } catch (e) {
          // recusada pelo servidor: não adianta tentar de novo
          if (!(e instanceof ApiError) || e.status >= 500) break
        }
        this.queue.shift()
        write(K_QUEUE, this.queue)
        this.notify()
      }
    } finally {
      this.busy.queue = false
    }
  }

  subscribe(cb: () => void) {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }

  // ---- área da equipe (senha do servidor)
  staff<T>(senha: string, acao = 'listar', extra: object = {}) {
    return this.call<T>('POST', '/equipe', { senha, acao, ...extra }, 15000)
  }
}

/** endereço do servidor: build do site (online.json) ou ajuste manual na máquina */
export function apiBase() {
  try {
    const manual = localStorage.getItem('lumis-run:api')
    if (manual) return manual
  } catch {
    // ignora
  }
  return import.meta.env.VITE_LUMIS_API || ''
}

function create(): RankingApi {
  const base = typeof window === 'undefined' ? '' : apiBase()
  if (!base) return new LocalApi()
  const api = new OnlineApi(base)
  api.start()
  return api
}

export const ranking: RankingApi = create()

export const isLocal = (r: RankingApi): r is LocalApi => !r.online
export const isOnline = (r: RankingApi): r is OnlineApi => r.online

