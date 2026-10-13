import { compareBooks, compareScore, mergeResult, type PlayerRecord, type PublicEntry, type RunResult } from './ranking'

/**
 * Ranking montado a partir da melhor partida de cada pessoa em cada critério.
 * Usado pelo servidor (dados do banco) e pelo jogo (cache e prévia de posição).
 */
export interface BestRun {
  kind: 'score' | 'books'
  publicId: string
  name: string
  photo: number | null
  score: number
  distance: number
  books: number
  durationMs: number
  at: number
}

export interface Board {
  byScore: PublicEntry[]
  byBooks: PublicEntry[]
}

export function buildBoard(rows: BestRun[], photoUrl: (id: string, v: number) => string = () => ''): Board {
  const byId = new Map<string, { s?: BestRun; b?: BestRun }>()
  for (const r of rows) {
    const e = byId.get(r.publicId) ?? {}
    if (r.kind === 'score') e.s = r
    else e.b = r
    byId.set(r.publicId, e)
  }
  const entries: (PublicEntry & { _s: BestRun; _b: BestRun })[] = []
  for (const [id, { s, b }] of byId) {
    if (!s || !b) continue
    entries.push({
      id,
      name: s.name,
      score: s.score,
      distance: Math.floor(s.distance),
      books: s.books,
      bestBooks: b.books,
      durationMs: s.durationMs,
      booksMs: b.durationMs,
      rawDistance: s.distance,
      ...(s.photo ? { photo: photoUrl(id, s.photo) } : {}),
      _s: s,
      _b: b,
    })
  }
  const strip = ({ _s, _b, ...e }: (typeof entries)[number]): PublicEntry => (void _s, void _b, e)
  return {
    byScore: entries.slice().sort((x, y) => compareScore(x._s, y._s)).map(strip),
    byBooks: entries.slice().sort((x, y) => compareBooks(x._b, y._b)).map(strip),
  }
}

type RunStats = { score: number; distance: number; books: number; durationMs: number }

const scoreStats = (e: PublicEntry): RunStats => ({ score: e.score, distance: e.rawDistance ?? e.distance, books: e.books, durationMs: e.durationMs ?? 0 })
const booksStats = (e: PublicEntry): RunStats => ({ score: 0, distance: 0, books: e.bestBooks, durationMs: e.booksMs ?? 0 })

/**
 * Posições que a partida teria no ranking online. Se a pessoa (selfId) já
 * está no ranking, vale o melhor entre o resultado dela e esta partida.
 */
export function boardPreview(board: Board, run: RunStats, selfId?: string) {
  const self = selfId ? board.byScore.find((e) => e.id === selfId) : undefined
  const bestS = self && compareScore(scoreStats(self), run) < 0 ? scoreStats(self) : run
  const selfB = self && booksStats(self)
  const runB = { ...run, score: 0, distance: 0 }
  const bestB = selfB && (selfB.books > runB.books || (selfB.books === runB.books && selfB.durationMs <= runB.durationMs)) ? selfB : runB
  const posScore = 1 + board.byScore.filter((e) => e.id !== selfId && compareScore(scoreStats(e), bestS) <= 0).length
  const posBooks = 1 + board.byBooks.filter((e) => e.id !== selfId && compareBooks(booksStats(e), bestB) <= 0).length
  return { posScore, posBooks }
}

/** lista privada da equipe a partir das partidas válidas, em ordem de envio */
export function playersFromRuns(runs: (RunResult & { at: number })[]): PlayerRecord[] {
  let players: PlayerRecord[] = []
  for (const r of runs.slice().sort((a, b) => a.at - b.at)) players = mergeResult(players, r, r.at).players
  return players.sort((a, b) => compareScore(a.best, b.best))
}
