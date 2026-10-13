import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Status = 'valid' | 'review' | 'rejected'

// sem erro, o Supabase devolve os dados (nulo só quando a função SQL devolve nulo)
function must<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error
  return r.data as T
}

/** id da linha criada (insert/upsert com .select('id').single()) */
function idOf(r: { data: { id: unknown } | null; error: unknown }): string {
  const row = must(r)
  if (!row) throw new Error('sem id')
  return String(row.id)
}

/** Acesso ao banco com a chave service_role (só existe no servidor). */
export class SupabaseDb {
  constructor(private sb: SupabaseClient) {}

  async createTicket(seed: number) {
    return idOf(await this.sb.from('lumis_tickets').insert({ seed }).select('id').single())
  }
  async consumeTicket(id: string) {
    return must(await this.sb.rpc('lumis_consume_ticket', { p_id: id })) as { seed: number; issuedAt: number } | null
  }
  async pruneTickets() {
    must(await this.sb.rpc('lumis_prune_tickets'))
  }
  async bestRuns() {
    return must(await this.sb.rpc('lumis_best_runs'))
  }
  async upsertPlayer(p: { key: string; publicId: string; name: string; phone: string }) {
    const row = { key: p.key, public_id: p.publicId, name: p.name, phone: p.phone, last_at: new Date().toISOString() }
    return idOf(await this.sb.from('lumis_players').upsert(row, { onConflict: 'key' }).select('id').single())
  }
  async insertRun(r: { playerId: string; ticketId: string | null; seed: number; status: Status; reason: string | null; score: number; distance: number; books: number; durationMs: number; commands: unknown; version: string | null }) {
    const row = { player_id: r.playerId, ticket_id: r.ticketId, seed: r.seed, status: r.status, reason: r.reason, score: r.score, distance: r.distance, books: r.books, duration_ms: r.durationMs, commands: r.commands, game_version: r.version }
    return idOf(await this.sb.from('lumis_runs').insert(row).select('id').single())
  }
  async savePhoto(playerId: string, publicId: string, jpeg: Uint8Array) {
    must(await this.sb.storage.from('lumis-fotos').upload(`${publicId}.jpg`, jpeg, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' }))
    must(await this.sb.from('lumis_players').update({ photo_version: Date.now() }).eq('id', playerId))
  }
  async staffRuns() {
    return must(await this.sb.rpc('lumis_staff_runs'))
  }
  async setRunStatus(id: string, status: Status) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return false
    const rows = must(await this.sb.from('lumis_runs').update({ status }).eq('id', id).eq('status', 'review').select('id'))
    return rows.length > 0
  }
  async clearAll() {
    must(await this.sb.rpc('lumis_clear'))
    // apaga todas as fotos do evento
    for (;;) {
      const files = must(await this.sb.storage.from('lumis-fotos').list('', { limit: 1000 }))
      if (!files.length) break
      must(await this.sb.storage.from('lumis-fotos').remove(files.map((f) => f.name)))
    }
  }
}
