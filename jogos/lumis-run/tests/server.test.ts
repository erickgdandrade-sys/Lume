import { describe, expect, it } from 'vitest'
import { createSim, scoreOf, step, type Command } from '../src/features/lumis-run/core/sim'
import { replay } from '../src/features/lumis-run/core/replay'
import { boardPreview } from '../src/features/lumis-run/ranking/board'
import { handle, type Deps } from '../server/handler'
import { MemoryDb } from '../server/memoryDb'
import { botTick } from './bot'

/** joga com o robô por alguns segundos e depois solta o controle até bater */
function play(seed: number, seconds: number) {
  const s = createSim(seed)
  const log: [number, Command][] = []
  while (!s.crashed) {
    if (s.time < seconds) botTick(s, log)
    step(s)
    s.events.length = 0
  }
  return { log, score: scoreOf(s), books: s.books, durationMs: Math.round(s.time * 1000) }
}

function setup() {
  let clock = 1_000_000
  let seed = 41
  const db = new MemoryDb(() => clock)
  const deps: Deps = { db, now: () => clock, randomSeed: () => seed++, staffPassword: 'segredo-da-equipe', photoUrl: (id, v) => `https://fotos/${id}.jpg?v=${v}`, wait: async () => {} }
  const call = async (method: string, path: string, body?: unknown) => handle({ method, path, body }, deps)
  const advance = (ms: number) => (clock += ms)
  /** partida completa: pede o bilhete, joga, espera o tempo real e envia */
  const run = async (name: string, phone: string, seconds: number, extra: object = {}) => {
    const t = (await call('POST', '/bilhete')).body as { token: string; seed: number }
    const p = play(t.seed, seconds)
    advance(p.durationMs + 3000)
    return call('POST', '/partida', { token: t.token, seed: t.seed, commands: p.log, name, phone, claimed: { score: p.score, books: p.books }, version: 't', ...extra })
  }
  return { db, deps, call, advance, run }
}

const JPEG = 'data:image/jpeg;base64,' + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3))

describe('reexecução da partida', () => {
  it('reproduz exatamente a pontuação do jogo', () => {
    const p = play(123, 20)
    const r = replay(123, p.log)
    expect(r).toMatchObject({ ok: true, score: p.score, books: p.books, durationMs: p.durationMs })
  })
  it('recusa registro adulterado', () => {
    const p = play(123, 10)
    expect(replay(123, [...p.log, [p.log.at(-1)![0] + 999999, 'jump']]).ok).toBe(false)
    expect(replay(123, [[5, 'voar' as Command]]).ok).toBe(false)
    expect(replay(123, [[9, 'left'], [3, 'left']]).ok).toBe(false)
  })
})

describe('servidor do ranking online', () => {
  it('grava a partida validada e devolve posição sem o WhatsApp', async () => {
    const { run, call } = setup()
    const res = await run('Ana', '(48) 99999-1234', 15, { photo: JPEG })
    expect(res.status).toBe(200)
    const body = res.body as { outcome: { posScore: number; status: string; entry: { photo?: string } } }
    expect(body.outcome.posScore).toBe(1)
    expect(body.outcome.status).toBe('ok')
    expect(body.outcome.entry.photo).toMatch(/^https:\/\/fotos\//)
    const board = (await call('GET', '/ranking')).body
    expect(JSON.stringify(board)).not.toMatch(/99999|1234/)
  })

  it('o ranking é o mesmo para todos e vale o melhor de cada pessoa', async () => {
    const { run, call } = setup()
    await run('Ana', '48999991234', 30)
    await run('Bia', '48988887777', 8)
    await run('Ana', '48999991234', 5)
    const { byScore } = (await call('GET', '/ranking')).body as { byScore: { name: string }[] }
    expect(byScore.map((e) => e.name)).toEqual(['Ana', 'Bia'])
  })

  it('usa a pontuação da reexecução, não a enviada pelo navegador', async () => {
    const { call, advance } = setup()
    const t = (await call('POST', '/bilhete')).body as { token: string; seed: number }
    const p = play(t.seed, 10)
    advance(p.durationMs + 3000)
    const res = await call('POST', '/partida', { token: t.token, commands: p.log, name: 'Caio', phone: '48999990000', claimed: { score: p.score + 5000, books: p.books } })
    expect(res.status).toBe(422)
    expect((await call('GET', '/ranking')).body).toEqual({ byScore: [], byBooks: [] })
  })

  it('bilhete só vale uma vez', async () => {
    const { call, advance } = setup()
    const t = (await call('POST', '/bilhete')).body as { token: string; seed: number }
    const p = play(t.seed, 5)
    advance(p.durationMs + 3000)
    const body = { token: t.token, commands: p.log, name: 'Duda', phone: '48999990001', claimed: { score: p.score, books: p.books } }
    expect((await call('POST', '/partida', body)).status).toBe(200)
    expect((await call('POST', '/partida', body)).status).toBe(409)
  })

  it('recusa partida enviada mais rápido do que ela dura', async () => {
    const { call, advance } = setup()
    const t = (await call('POST', '/bilhete')).body as { token: string; seed: number }
    const p = play(t.seed, 30)
    advance(2000)
    const res = await call('POST', '/partida', { token: t.token, commands: p.log, name: 'Eva', phone: '48999990002', claimed: { score: p.score, books: p.books } })
    expect(res.body).toMatchObject({ error: 'partida', detail: 'tempo' })
  })

  it('sem bilhete fica em análise até a equipe aprovar', async () => {
    const { call } = setup()
    const p = play(777, 6)
    const res = await call('POST', '/partida', { seed: 777, commands: p.log, name: 'Fabi', phone: '48999990003', claimed: { score: p.score, books: p.books } })
    expect((res.body as { outcome: { status: string } }).outcome.status).toBe('analise')
    expect(((await call('GET', '/ranking')).body as { byScore: unknown[] }).byScore).toHaveLength(0)
    const view = (await call('POST', '/equipe', { senha: 'segredo-da-equipe' })).body as { review: { id: string }[] }
    expect(view.review).toHaveLength(1)
    await call('POST', '/equipe', { senha: 'segredo-da-equipe', acao: 'aprovar', runId: view.review[0].id })
    expect(((await call('GET', '/ranking')).body as { byScore: unknown[] }).byScore).toHaveLength(1)
  })

  it('valida nome, WhatsApp e foto', async () => {
    const { run } = setup()
    expect((await run('x', '48999991234', 3)).body).toMatchObject({ error: 'nome' })
    expect((await run('Gabi', '123', 3)).body).toMatchObject({ error: 'whatsapp' })
    expect((await run('Gabi', '48999991234', 3, { photo: 'data:image/png;base64,AAAA' })).body).toMatchObject({ error: 'foto' })
  })

  it('área da equipe exige a senha e mostra o WhatsApp', async () => {
    const { run, call } = setup()
    await run('Helena', '48999991111', 5)
    expect((await call('POST', '/equipe', { senha: 'errada' })).status).toBe(401)
    expect((await call('POST', '/equipe', {})).status).toBe(401)
    const view = (await call('POST', '/equipe', { senha: 'segredo-da-equipe' })).body as { players: { phone: string; runs: number }[] }
    expect(view.players[0]).toMatchObject({ phone: '48999991111', runs: 1 })
    await call('POST', '/equipe', { senha: 'segredo-da-equipe', acao: 'limpar' })
    expect(((await call('GET', '/ranking')).body as { byScore: unknown[] }).byScore).toHaveLength(0)
  })

  it('aviso de mesmo nome e WhatsApp consulta o servidor', async () => {
    const { run, call } = setup()
    await run('Igor', '48999992222', 5)
    expect(((await call('POST', '/jogador', { name: 'igor', phone: '(48) 99999-2222' })).body as { entry: unknown }).entry).not.toBeNull()
    expect(((await call('POST', '/jogador', { name: 'Igor', phone: '48999993333' })).body as { entry: unknown }).entry).toBeNull()
  })

  it('prévia de posição com o ranking online', async () => {
    const { run, call } = setup()
    await run('Ana', '48999991234', 30)
    await run('Bia', '48988887777', 4)
    const board = (await call('GET', '/ranking')).body as Parameters<typeof boardPreview>[0]
    expect(boardPreview(board, { score: 1, distance: 1, books: 0, durationMs: 1000 })).toEqual({ posScore: 3, posBooks: 3 })
    expect(boardPreview(board, { score: 999999, distance: 99999, books: 999, durationMs: 1000 })).toEqual({ posScore: 1, posBooks: 1 })
  })
})
