import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { describe, expect, it } from 'vitest'

/** Aplica a migration real num Postgres em memória e confere as funções do ranking. */
const SQL = readFileSync(new URL('../../../supabase/migrations/20261013000000_lumis_run.sql', import.meta.url), 'utf8')

async function db() {
  const pg = new PGlite()
  await pg.exec(`create role anon; create role authenticated; create role service_role;`)
  await pg.exec(SQL)
  return pg
}

const one = async <T,>(pg: PGlite, q: string, p: unknown[] = []) => ((await pg.query<Record<string, T>>(q, p)).rows[0] ?? {}) as Record<string, T>

describe('migration do ranking online', { timeout: 60000 }, () => {
  it('bilhete vale uma vez só', async () => {
    const pg = await db()
    const { id } = await one<string>(pg, `insert into lumis_tickets (seed) values (4294967295) returning id`)
    const a = await one<{ seed: number }>(pg, `select lumis_consume_ticket($1) as t`, [id])
    const b = await one<unknown>(pg, `select lumis_consume_ticket($1) as t`, [id])
    expect(Number(a.t.seed)).toBe(4294967295)
    expect(b.t).toBeNull()
  })

  it('melhor partida por pessoa em pontos e em livros', async () => {
    const pg = await db()
    const { id } = await one<string>(pg, `insert into lumis_players (key, public_id, name, phone) values ('ana|48999991234','abc','Ana','48999991234') returning id`)
    const ins = (score: number, books: number, ms: number, status = 'valid') =>
      pg.query(`insert into lumis_runs (player_id, seed, status, score, distance, books, duration_ms, commands) values ($1, 1, $2, $3::int, $3::float8, $4, $5, '[]')`, [id, status, score, books, ms])
    await ins(900, 6, 50000)
    await ins(300, 20, 30000)
    await ins(5000, 99, 1000, 'rejected')
    const { rows } = await one<{ kind: string; score: number; books: number; name: string; publicId: string }[]>(pg, `select lumis_best_runs() as rows`)
    const s = rows.find((r) => r.kind === 'score')!
    const b = rows.find((r) => r.kind === 'books')!
    expect([s.score, b.books, s.publicId]).toEqual([900, 20, 'abc'])
    expect(JSON.stringify(rows)).not.toMatch(/48999991234/)
    const staff = await one<{ phone: string }[]>(pg, `select lumis_staff_runs() as r`)
    expect(staff.r).toHaveLength(3)
    expect(staff.r[0].phone).toBe('48999991234')
    await pg.query(`select lumis_clear()`)
    expect((await one<unknown[]>(pg, `select lumis_best_runs() as r`)).r).toEqual([])
  })

  it('navegador (anon) não lê nem grava as tabelas nem chama as funções', async () => {
    const pg = await db()
    await pg.exec(`set role anon`)
    await expect(pg.query(`select * from lumis_players`)).rejects.toThrow()
    await expect(pg.query(`insert into lumis_tickets (seed) values (1)`)).rejects.toThrow()
    await expect(pg.query(`select lumis_staff_runs()`)).rejects.toThrow()
  })

  it('recusa WhatsApp e nome fora do formato', async () => {
    const pg = await db()
    await expect(pg.query(`insert into lumis_players (key, public_id, name, phone) values ('a','b','Ana','abc')`)).rejects.toThrow()
    await expect(pg.query(`insert into lumis_players (key, public_id, name, phone) values ('a','b','A','48999991234')`)).rejects.toThrow()
  })
})
