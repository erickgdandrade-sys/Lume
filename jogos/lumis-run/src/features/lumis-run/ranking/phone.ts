/**
 * WhatsApp do jogador (Brasil): DDD + número. Guardado só com dígitos, sem o 55.
 * É dado pessoal: nunca aparece no ranking público, só no painel da equipe.
 */
export function phoneDigits(raw: string) {
  let d = raw.replace(/\D/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  if (d.length === 12 && d.startsWith('0')) d = d.slice(1) // 0 + DDD + celular
  return d
}

export type PhoneError = 'vazio' | 'curto' | 'ddd' | 'celular'

export function validatePhone(raw: string): PhoneError | null {
  const d = phoneDigits(raw)
  if (!d) return 'vazio'
  if (d.length < 10 || d.length > 11) return 'curto'
  if (d[0] === '0' || d[1] === '0') return 'ddd'
  if (d.length === 11 && d[2] !== '9') return 'celular'
  return null
}

export const PHONE_ERROR_TEXT: Record<PhoneError, string> = {
  vazio: 'Coloque seu WhatsApp para a gente avisar se você ganhar.',
  curto: 'Digite o DDD e o número, por exemplo (48) 99999-1234.',
  ddd: 'Confira o DDD.',
  celular: 'Celular com 11 dígitos começa com 9 depois do DDD.',
}

/** (48) 99999-1234 */
export function formatPhone(raw: string) {
  const d = phoneDigits(raw)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  const ddd = d.slice(0, 2)
  const n = d.slice(2)
  const cut = n.length > 8 ? 5 : 4
  return n.length > cut ? `(${ddd}) ${n.slice(0, cut)}-${n.slice(cut)}` : `(${ddd}) ${n}`
}

/** link wa.me para a equipe chamar o ganhador */
export function whatsappLink(digits: string) {
  return `https://wa.me/55${digits}`
}
