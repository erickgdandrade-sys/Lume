import { describe, expect, it } from 'vitest'
import { cleanName, nameKey, validateName } from '../src/features/lumis-run/ranking/names'
import { formatPhone, phoneDigits, validatePhone } from '../src/features/lumis-run/ranking/phone'
import { compareBooks, compareScore, mergeResult, previewPositions, publicEntry, toCsv, type PlayerRecord, type RunResult } from '../src/features/lumis-run/ranking/ranking'
import { decodeStory, encodeStory, isPublicBase, storyCodeFromHash, storyUrl } from '../src/features/lumis-run/share/storyData'

const ANA = '48999991111'
const r = (name: string, score: number, extra: Partial<RunResult> = {}): RunResult => ({ name, phone: ANA, score, distance: score - 50, books: 5, durationMs: 60000, seed: 1, ...extra })
const add = (players: PlayerRecord[], run: RunResult, at = 0) => mergeResult(players, run, at)

describe('nomes', () => {
  it('compara sem acento, maiúsculas e espaços extras', () => {
    expect(nameKey('  João   Silva ')).toBe(nameKey('joao silva'))
    expect(cleanName('  Ana   Souza ')).toBe('Ana Souza')
  })
  it('valida tamanho, caracteres e palavras impróprias', () => {
    expect(validateName('A')).toBe('curto')
    expect(validateName('x'.repeat(21))).toBe('longo')
    expect(validateName('Ana <script>')).toBe('caracteres')
    expect(validateName('Merda')).toBe('impróprio')
    expect(validateName('Cunha')).toBe(null) // não bloqueia por pedaço de palavra
    expect(validateName("Maria D'Ávila-2")).toBe(null)
  })
})

describe('WhatsApp', () => {
  it('aceita com máscara, com 55 e com zero na frente', () => {
    expect(phoneDigits('(48) 99999-1111')).toBe(ANA)
    expect(phoneDigits('+55 48 99999-1111')).toBe(ANA)
    expect(phoneDigits('048999991111')).toBe(ANA)
    expect(validatePhone('(48) 99999-1111')).toBe(null)
    expect(validatePhone('(48) 3222-1111')).toBe(null) // fixo com 10 dígitos
  })
  it('recusa vazio, curto, DDD inválido e celular sem 9', () => {
    expect(validatePhone('')).toBe('vazio')
    expect(validatePhone('99999')).toBe('curto')
    expect(validatePhone('(08) 99999-1111')).toBe('ddd')
    expect(validatePhone('(48) 89999-1111')).toBe('celular')
  })
  it('formata para exibição', () => {
    expect(formatPhone(ANA)).toBe('(48) 99999-1111')
    expect(formatPhone('4832221111')).toBe('(48) 3222-1111')
    expect(formatPhone('489')).toBe('(48) 9')
  })
})

describe('rankings', () => {
  it('pontos: desempata por distância, livros e menor duração', () => {
    const a = r('A', 500, { distance: 400 })
    const b = r('B', 500, { distance: 420 })
    const c = r('C', 500, { distance: 420, books: 8 })
    const d = r('D', 500, { distance: 420, books: 8, durationMs: 50000 })
    expect([a, b, c, d].sort(compareScore).map((x) => x.name)).toEqual(['D', 'C', 'B', 'A'])
  })
  it('livros: mais livros, depois quem pegou mais rápido', () => {
    const a = r('A', 900, { books: 10, durationMs: 90000 })
    const b = r('B', 300, { books: 12 })
    const c = r('C', 400, { books: 10, durationMs: 70000 })
    expect([a, b, c].sort(compareBooks).map((x) => x.name)).toEqual(['B', 'C', 'A'])
  })
  it('mesmo nome e mesmo WhatsApp: vale o melhor de cada ranking', () => {
    let p = add([], r('Ana', 300, { books: 20 })).players
    const worse = add(p, r('ana', 200, { books: 4 }))
    expect(worse.players).toHaveLength(1)
    expect(worse.outcome.improvedScore).toBe(false)
    expect(worse.outcome.improvedBooks).toBe(false)
    expect(worse.players[0].best.score).toBe(300)
    expect(worse.players[0].bestBooks.books).toBe(20)
    expect(worse.players[0].runs).toBe(2)
    // mais pontos com menos livros: só o ranking de pontos melhora
    p = worse.players
    const better = add(p, r('ANA', 900, { books: 6 }))
    expect(better.outcome.improvedScore).toBe(true)
    expect(better.outcome.improvedBooks).toBe(false)
    expect(better.outcome.previousBest).toBe(300)
    expect(better.players[0].best.score).toBe(900)
    expect(better.players[0].bestBooks.books).toBe(20)
  })
  it('mesmo nome com outro WhatsApp é outra pessoa', () => {
    const p = add([], r('Ana', 300)).players
    const other = add(p, r('Ana', 200, { phone: '48988887777' }))
    expect(other.players).toHaveLength(2)
    expect(other.outcome.posScore).toBe(2)
  })
  it('informa a posição em cada ranking', () => {
    let p: PlayerRecord[] = []
    for (const [n, s, b, ph] of [['A', 900, 3, '11911111111'], ['B', 700, 30, '11922222222'], ['C', 500, 10, '11933333333']] as const) p = add(p, r(n, s, { books: b, phone: ph })).players
    const out = add(p, r('D', 800, { books: 12, phone: '11944444444' }))
    expect(out.outcome.posScore).toBe(2)
    expect(out.outcome.posBooks).toBe(2)
    expect(previewPositions(p, { score: 950, distance: 1, books: 1, durationMs: 1, seed: 1 })).toEqual({ posScore: 1, posBooks: 4 })
  })
  it('o ranking público não leva o WhatsApp', () => {
    const p = add([], r('Ana', 300)).players
    const pub = publicEntry(p[0])
    expect(JSON.stringify(pub)).not.toContain('99999')
    expect(Object.keys(pub)).not.toContain('phone')
  })
  it('planilha da equipe tem o contato e protege contra fórmula', () => {
    const p = add([], r('=Ana', 300)).players
    const csv = toCsv(p)
    expect(csv).toContain('+5548999991111')
    expect(csv).toContain("'=Ana")
  })
})

describe('arte dos stories', () => {
  const d = { name: 'João Ávila', score: 1234, books: 17, distance: 980, posScore: 3, posBooks: 1 }
  it('codifica e decodifica com acentos, sem telefone', () => {
    const code = encodeStory(d)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeStory(code)).toEqual(d)
    expect(storyCodeFromHash('#arte=' + code)).toBe(code)
  })
  it('rejeita dados inválidos e limpa nome impróprio', () => {
    expect(decodeStory('lixo')).toBe(null)
    expect(decodeStory(encodeStory({ ...d, name: 'merda' }))?.name).toBe('')
    expect(decodeStory(encodeStory({ ...d, score: -5, posScore: null }))).toMatchObject({ score: 0, posScore: null })
  })
  it('monta o link e reconhece endereço público', () => {
    expect(storyUrl(d, 'https://lume.com.br/lumis-run#x')).toMatch(/^https:\/\/lume\.com\.br\/lumis-run#arte=/)
    expect(isPublicBase('https://lume.com.br/lumis-run')).toBe(true)
    expect(isPublicBase('http://lume.com.br')).toBe(false)
    expect(isPublicBase('https://localhost:4173/')).toBe(false)
    expect(isPublicBase('https://192.168.0.10/')).toBe(false)
    expect(isPublicBase('file:///C:/lumis-run-3d.html')).toBe(false)
  })
})
