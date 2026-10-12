/** Regras do nome exibido no ranking. */
export const NAME_LIMITS = { min: 2, max: 20 } as const

const BLOCKED = ['porra', 'caralho', 'merda', 'puta', 'puto', 'buceta', 'foda', 'fdp', 'viado', 'bosta', 'cacete', 'arrombado', 'vagabunda', 'piroca', 'pinto', 'cu']

/** espaços normalizados, como será exibido */
export function cleanName(raw: string) {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/** chave de comparação: sem acentos, minúsculas, sem pontuação */
export function nameKey(raw: string) {
  return cleanName(raw)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type NameError = 'curto' | 'longo' | 'caracteres' | 'impróprio'

export function validateName(raw: string): NameError | null {
  const n = cleanName(raw)
  if (n.length < NAME_LIMITS.min) return 'curto'
  if (n.length > NAME_LIMITS.max) return 'longo'
  if (!/^[\p{L}\p{N} .'-]+$/u.test(n)) return 'caracteres'
  const words = nameKey(n).split(' ')
  if (words.some((w) => BLOCKED.includes(w))) return 'impróprio'
  return null
}

export const NAME_ERROR_TEXT: Record<NameError, string> = {
  curto: `Digite pelo menos ${NAME_LIMITS.min} letras.`,
  longo: `Use no máximo ${NAME_LIMITS.max} caracteres.`,
  caracteres: 'Use só letras, números, espaço, ponto, hífen ou apóstrofo.',
  impróprio: 'Escolha outro nome para aparecer no ranking.',
}
