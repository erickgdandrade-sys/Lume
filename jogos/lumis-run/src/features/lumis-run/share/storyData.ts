import { cleanName, validateName } from '../ranking/names'

/**
 * Dados da arte dos stories, codificados no endereço (#arte=...).
 * Só nome, pontos, livros, distância e posições: nunca o WhatsApp.
 */
export interface StoryData {
  name: string
  score: number
  books: number
  distance: number
  posScore: number | null
  posBooks: number | null
  /** imagem oficial da Lumis sorteada para a arte (índice em POSES) */
  pose?: number
}

const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0)
const pos = (v: unknown) => (typeof v === 'number' && v >= 1 ? int(v, 99999) : null)

function toB64Url(s: string) {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeStory(d: StoryData) {
  const o: Record<string, unknown> = { v: 1, n: d.name, s: d.score, b: d.books, d: d.distance }
  if (d.posScore) o.p = d.posScore
  if (d.posBooks) o.l = d.posBooks
  if (d.pose != null) o.o = d.pose
  return toB64Url(JSON.stringify(o))
}

/** aceita só dados válidos; nome impróprio ou estranho vira vazio */
export function decodeStory(code: string): StoryData | null {
  try {
    const o = JSON.parse(fromB64Url(code))
    if (!o || o.v !== 1) return null
    const raw = typeof o.n === 'string' ? cleanName(o.n) : ''
    return {
      name: raw && !validateName(raw) ? raw : '',
      score: int(o.s, 9_999_999),
      books: int(o.b, 99_999),
      distance: int(o.d, 9_999_999),
      posScore: pos(o.p),
      posBooks: pos(o.l),
      ...(typeof o.o === 'number' && Number.isInteger(o.o) && o.o >= 0 && o.o < 64 ? { pose: o.o } : {}),
    }
  } catch {
    return null
  }
}

const BASE_KEY = 'lumis-run:endereco-publico'

/** endereço público do jogo: definido pela equipe, por variável de build ou o atual */
export function shareBase() {
  let saved = ''
  try {
    saved = localStorage.getItem(BASE_KEY) ?? ''
  } catch {
    // sem armazenamento
  }
  const env = (import.meta.env.VITE_SHARE_BASE as string | undefined) ?? ''
  return (saved || env || location.href).split('#')[0]
}

export function setShareBase(url: string) {
  try {
    if (url.trim()) localStorage.setItem(BASE_KEY, url.trim())
    else localStorage.removeItem(BASE_KEY)
  } catch {
    // sem armazenamento
  }
}

export function storyUrl(d: StoryData, base = shareBase()) {
  return `${base.split('#')[0]}#arte=${encodeStory(d)}`
}

/** o celular do visitante só abre endereços públicos com https */
export function isPublicBase(base: string) {
  try {
    const u = new URL(base)
    if (u.protocol !== 'https:') return false
    const h = u.hostname
    if (h === 'localhost' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false
    if (h.endsWith('claudeusercontent.com')) return false // moldura da prévia
    return true
  } catch {
    return false
  }
}

export function storyCodeFromHash(hash = location.hash) {
  const m = /^#arte=([A-Za-z0-9_-]+)$/.exec(hash)
  return m ? m[1] : null
}
