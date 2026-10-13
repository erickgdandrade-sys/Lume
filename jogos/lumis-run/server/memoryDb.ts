import { compareBooks, compareScore } from '../src/features/lumis-run/ranking/ranking'
import type { BestRun } from '../src/features/lumis-run/ranking/board'
import type { Db, StaffRun } from './handler'

/** Banco em memória com o mesmo comportamento das funções SQL (testes e servidor local). */
export class MemoryDb implements Db {
  tickets = new Map<string, { seed: number; issuedAt: number; usedAt: number | null }>()
  players = new Map<string, { id: string; key: string; publicId: string; name: string; phone: string; photo: number | null }>()
  runs: (StaffRun & { playerId: string; commands: unknown })[] = []
  photos = new Map<string, Uint8Array>()
  private n = 0
  constructor(private now: () => number = Date.now) {}

  private uuid() {
    const h = (++this.n).toString(16).padStart(12, '0')
    return `00000000-0000-4000-8000-${h}`
  }

  async createTicket(seed: number) {
    const id = this.uuid()
    this.tickets.set(id, { seed, issuedAt: this.now(), usedAt: null })
    return id
  }
  async consumeTicket(id: string) {
    const t = this.tickets.get(id)
    if (!t || t.usedAt != null || t.issuedAt < this.now() - 24 * 3600e3) return null
    t.usedAt = this.now()
    return { seed: t.seed, issuedAt: t.issuedAt }
  }
  async pruneTickets() {
    for (const [id, t] of this.tickets) if (t.issuedAt < this.now() - 48 * 3600e3) this.tickets.delete(id)
  }
  async bestRuns(): Promise<BestRun[]> {
    const out: BestRun[] = []
    const byPlayer = new Map<string, StaffRun[]>()
    for (const r of this.runs) if (r.status === 'valid') byPlayer.set(r.playerId, [...(byPlayer.get(r.playerId) ?? []), r])
    for (const [pid, list] of byPlayer) {
      const p = [...this.players.values()].find((x) => x.id === pid)!
      const s = list.slice().sort(compareScore)[0]
      const b = list.slice().sort(compareBooks)[0]
      for (const [kind, r] of [['score', s], ['books', b]] as const) out.push({ kind, publicId: p.publicId, name: p.name, photo: p.photo, score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, at: r.at })
    }
    return out
  }
  async upsertPlayer(p: { key: string; publicId: string; name: string; phone: string }) {
    const cur = this.players.get(p.key)
    if (cur) {
      cur.name = p.name
      return cur.id
    }
    const id = this.uuid()
    this.players.set(p.key, { id, ...p, photo: null })
    return id
  }
  async insertRun(r: Parameters<Db['insertRun']>[0]) {
    const p = [...this.players.values()].find((x) => x.id === r.playerId)!
    const id = this.uuid()
    this.runs.push({ id, playerId: r.playerId, status: r.status, reason: r.reason, publicId: p.publicId, name: p.name, phone: p.phone, photo: p.photo, score: r.score, distance: r.distance, books: r.books, durationMs: r.durationMs, seed: r.seed, at: this.now() + this.runs.length / 1000, commands: r.commands })
    return id
  }
  async savePhoto(playerId: string, publicId: string, jpeg: Uint8Array) {
    this.photos.set(publicId, jpeg)
    const p = [...this.players.values()].find((x) => x.id === playerId)!
    p.photo = this.now()
  }
  async staffRuns() {
    return this.runs.map(({ playerId, commands, ...r }) => {
      void commands
      const p = [...this.players.values()].find((x) => x.id === playerId)!
      return { ...r, name: p.name, phone: p.phone, photo: p.photo }
    })
  }
  async setRunStatus(id: string, status: StaffRun['status']) {
    const r = this.runs.find((x) => x.id === id)
    if (!r) return false
    r.status = status
    return true
  }
  async clearAll() {
    this.tickets.clear()
    this.players.clear()
    this.runs = []
    this.photos.clear()
  }
}
