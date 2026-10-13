import { replay, isCommandLog } from '../src/features/lumis-run/core/replay'
import { buildBoard, playersFromRuns, type BestRun, type Board } from '../src/features/lumis-run/ranking/board'
import { cleanName, validateName } from '../src/features/lumis-run/ranking/names'
import { phoneDigits, validatePhone } from '../src/features/lumis-run/ranking/phone'
import { compareBooks, compareScore, playerKey, playerPublicId, type PlayerRecord, type PublicEntry, type SubmitOutcome } from '../src/features/lumis-run/ranking/ranking'

/**
 * Servidor do ranking online (roda na Edge Function "lumis-run" do Supabase).
 * Lógica pura, sem dependência do Supabase, para ser testada com um banco em memória.
 *
 * Regras:
 *  - a pontuação oficial é a da reexecução da partida (semente + comandos);
 *  - a semente vem de um bilhete emitido pelo servidor antes da partida, de uso único;
 *  - o tempo real entre o bilhete e o envio tem que cobrir a duração da partida;
 *  - sem bilhete (stand sem internet desde que abriu o jogo) a partida fica "em análise"
 *    até a equipe aprovar;
 *  - o WhatsApp nunca sai nas respostas públicas.
 */
export interface StaffRun {
  id: string
  status: 'valid' | 'review' | 'rejected'
  reason: string | null
  publicId: string
  name: string
  phone: string
  photo: number | null
  score: number
  distance: number
  books: number
  durationMs: number
  seed: number
  at: number
}

export interface Db {
  createTicket(seed: number): Promise<string>
  consumeTicket(id: string): Promise<{ seed: number; issuedAt: number } | null>
  pruneTickets(): Promise<void>
  bestRuns(): Promise<BestRun[]>
  upsertPlayer(p: { key: string; publicId: string; name: string; phone: string }): Promise<string>
  insertRun(r: { playerId: string; ticketId: string | null; seed: number; status: StaffRun['status']; reason: string | null; score: number; distance: number; books: number; durationMs: number; commands: unknown; version: string | null }): Promise<string>
  savePhoto(playerId: string, publicId: string, jpeg: Uint8Array): Promise<void>
  staffRuns(): Promise<StaffRun[]>
  setRunStatus(id: string, status: StaffRun['status']): Promise<boolean>
  clearAll(): Promise<void>
}

export interface Deps {
  db: Db
  now: () => number
  randomSeed: () => number
  /** senha da área da equipe (segredo do servidor). Sem senha, a área fica fechada. */
  staffPassword: string
  photoUrl: (publicId: string, version: number) => string
  /** atraso depois de senha errada (ms) */
  wait?: (ms: number) => Promise<void>
}

export interface Req {
  method: string
  path: string
  body: unknown
}

export interface Res {
  status: number
  body: unknown
}

/** folga entre o relógio do servidor e a duração da partida (contagem, rede) */
export const TIME_SLACK_MS = 3000
export const MAX_PHOTO_BYTES = 100 * 1024

const ok = (body: unknown): Res => ({ status: 200, body })
const fail = (status: number, error: string, extra: object = {}): Res => ({ status, body: { error, ...extra } })

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const obj = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

export async function handle(req: Req, deps: Deps): Promise<Res> {
  try {
    const route = `${req.method.toUpperCase()} ${req.path.replace(/\/+$/, '') || '/'}`
    switch (route) {
      case 'GET /ranking':
        return ok(await board(deps))
      case 'POST /bilhete':
        return ok(await ticket(deps))
      case 'POST /jogador':
        return ok(await findPlayer(obj(req.body), deps))
      case 'POST /partida':
        return await submit(obj(req.body), deps)
      case 'POST /equipe':
        return await staff(obj(req.body), deps)
      default:
        return fail(404, 'rota')
    }
  } catch (e) {
    console.error(e)
    return fail(500, 'servidor')
  }
}

async function board(deps: Deps): Promise<Board> {
  return buildBoard(await deps.db.bestRuns(), deps.photoUrl)
}

async function ticket(deps: Deps) {
  const seed = deps.randomSeed() >>> 0
  const token = await deps.db.createTicket(seed)
  // limpeza ocasional de bilhetes velhos
  if (seed % 50 === 0) await deps.db.pruneTickets()
  return { token, seed }
}

async function findPlayer(b: Record<string, unknown>, deps: Deps) {
  const name = cleanName(str(b.name))
  const phone = phoneDigits(str(b.phone))
  if (validateName(name) || validatePhone(phone)) return { entry: null }
  const id = playerPublicId(name, phone)
  const { byScore } = await board(deps)
  return { entry: byScore.find((e) => e.id === id) ?? null }
}

function decodePhoto(v: unknown): Uint8Array | null | 'invalida' {
  if (v == null || v === '') return null
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(str(v))
  if (!m) return 'invalida'
  const bin = atob(m[1])
  if (bin.length > MAX_PHOTO_BYTES) return 'invalida'
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  // JPEG começa com FF D8
  return out[0] === 0xff && out[1] === 0xd8 ? out : 'invalida'
}

async function submit(b: Record<string, unknown>, deps: Deps): Promise<Res> {
  const name = cleanName(str(b.name))
  const phone = phoneDigits(str(b.phone))
  const nameErr = validateName(name)
  if (nameErr) return fail(400, 'nome', { detail: nameErr })
  const phoneErr = validatePhone(phone)
  if (phoneErr) return fail(400, 'whatsapp', { detail: phoneErr })
  if (!isCommandLog(b.commands)) return fail(400, 'comandos')
  const claimed = obj(b.claimed)
  const photo = decodePhoto(b.photo)
  if (photo === 'invalida') return fail(400, 'foto')
  const version = str(b.version).slice(0, 40) || null

  // semente: do bilhete do servidor (oficial) ou do próprio jogo (fica em análise)
  const token = str(b.token)
  let seed = Number(b.seed)
  let status: StaffRun['status'] = 'valid'
  let reason: string | null = null
  let issuedAt: number | null = null
  if (token) {
    const t = /^[0-9a-f-]{36}$/i.test(token) ? await deps.db.consumeTicket(token) : null
    if (!t) return fail(409, 'bilhete')
    seed = t.seed
    issuedAt = t.issuedAt
  } else {
    status = 'review'
    reason = 'sem-bilhete'
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return fail(400, 'semente')

  const r = replay(seed, b.commands)
  if (!r.ok) {
    status = 'rejected'
    reason = `replay:${r.reason}`
  } else if (r.score !== Number(claimed.score) || r.books !== Number(claimed.books)) {
    status = 'rejected'
    reason = 'replay:diferente'
  } else if (issuedAt != null && deps.now() - issuedAt < r.durationMs - TIME_SLACK_MS) {
    status = 'rejected'
    reason = 'tempo'
  }

  const before = await board(deps)
  const key = playerKey(name, phone)
  const publicId = playerPublicId(name, phone)
  const playerId = await deps.db.upsertPlayer({ key, publicId, name, phone })
  const stats = r.ok ? r : { score: 0, distance: 0, books: 0, durationMs: 0 }
  await deps.db.insertRun({ playerId, ticketId: token || null, seed, status, reason, score: stats.score, distance: stats.distance, books: stats.books, durationMs: stats.durationMs, commands: b.commands, version })
  if (status === 'rejected') return fail(422, 'partida', { detail: reason })
  if (photo) await deps.db.savePhoto(playerId, publicId, photo)

  const after = await board(deps)
  const prev = before.byScore.find((e) => e.id === publicId)
  const run = { score: stats.score, distance: stats.distance, books: stats.books, durationMs: stats.durationMs }
  let outcome: SubmitOutcome
  if (status === 'valid') {
    const entry = after.byScore.find((e) => e.id === publicId)!
    outcome = {
      entry,
      posScore: after.byScore.findIndex((e) => e.id === publicId) + 1,
      posBooks: after.byBooks.findIndex((e) => e.id === publicId) + 1,
      improvedScore: !prev || compareScore(run, { score: prev.score, distance: prev.rawDistance ?? prev.distance, books: prev.books, durationMs: prev.durationMs ?? 0 }) < 0,
      improvedBooks: !prev || compareBooks(run, { score: 0, distance: 0, books: prev.bestBooks, durationMs: prev.booksMs ?? 0 }) < 0,
      previousBest: prev?.score ?? null,
      previousBooks: prev?.bestBooks ?? null,
      status: 'ok',
    }
  } else {
    // em análise: ainda não aparece no ranking
    const entry: PublicEntry = { id: publicId, name, score: run.score, distance: Math.floor(run.distance), books: run.books, bestBooks: run.books }
    outcome = { entry, posScore: 0, posBooks: 0, improvedScore: false, improvedBooks: false, previousBest: prev?.score ?? null, previousBooks: prev?.bestBooks ?? null, status: 'analise' }
  }
  return ok({ outcome, board: after })
}

/** comparação em tempo constante (não vaza o tamanho do prefixo certo) */
function sameSecret(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export interface StaffView {
  players: (PlayerRecord & { publicId: string; photo?: string })[]
  review: StaffRun[]
}

async function staff(b: Record<string, unknown>, deps: Deps): Promise<Res> {
  if (!deps.staffPassword || !sameSecret(str(b.senha), deps.staffPassword)) {
    await (deps.wait ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(800)
    return fail(401, 'senha')
  }
  const action = str(b.acao) || 'listar'
  if (action === 'limpar') await deps.db.clearAll()
  else if (action === 'aprovar' || action === 'recusar') {
    const changed = await deps.db.setRunStatus(str(b.runId), action === 'aprovar' ? 'valid' : 'rejected')
    if (!changed) return fail(404, 'partida')
  } else if (action !== 'listar') return fail(400, 'acao')

  const runs = await deps.db.staffRuns()
  const photos = new Map<string, number>()
  for (const r of runs) if (r.photo) photos.set(r.publicId, r.photo)
  const players = playersFromRuns(runs.filter((r) => r.status === 'valid').map((r) => ({ name: r.name, phone: r.phone, score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, seed: r.seed, at: r.at }))).map((p) => {
    const id = playerPublicId(p.name, p.phone)
    const v = photos.get(id)
    return { ...p, publicId: id, ...(v ? { photo: deps.photoUrl(id, v) } : {}) }
  })
  const view: StaffView = { players, review: runs.filter((r) => r.status === 'review') }
  return ok(view)
}
