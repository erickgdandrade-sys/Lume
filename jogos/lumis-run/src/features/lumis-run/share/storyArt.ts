import LOGO_BRANCO from '../../../assets/lume-logo-branco.png'
import { POSES, poseFor } from './poses'
import type { StoryData } from './storyData'

/** Arte vertical 1080×1920 para os stories, desenhada em canvas. */
export const STORY_W = 1080
export const STORY_H = 1920

const C = {
  azul: '#3B82F6',
  rosa: '#F472B6',
  amarelo: '#FBBF24',
  verde: '#34D399',
  roxo: '#8B5CF6',
  laranja: '#FB923C',
  tinta: '#0F172A',
  tinta2: '#475569',
}

const imgCache = new Map<string, Promise<HTMLImageElement>>()
function loadImg(src: string) {
  let p = imgCache.get(src)
  if (!p) {
    p = new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = src
    })
    imgCache.set(src, p)
  }
  return p
}

const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR')

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

/** reduz a fonte até o texto caber na largura */
function fitFont(g: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number) {
  let s = size
  do {
    g.font = `${weight} ${s}px Poppins, system-ui, sans-serif`
    if (g.measureText(text).width <= maxW) break
    s -= 4
  } while (s > 24)
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, rot: number) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2
    const rr = i % 2 ? r * 0.48 : r
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  g.closePath()
  g.fillStyle = color
  g.fill()
  g.restore()
}

function book(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, rot: number) {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.fillStyle = color
  roundRect(g, -s * 0.38, -s * 0.5, s * 0.76, s, s * 0.08)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.fillRect(-s * 0.38 + s * 0.08, -s * 0.5 + s * 0.06, s * 0.08, s * 0.88)
  g.restore()
}

/** pílula com texto centralizado */
function pill(g: CanvasRenderingContext2D, cx: number, y: number, text: string, bg: string, fg: string, size: number, padX = 36, h = size * 1.9) {
  g.font = `700 ${size}px Poppins, system-ui, sans-serif`
  const w = g.measureText(text).width + padX * 2
  roundRect(g, cx - w / 2, y, w, h, h / 2)
  g.fillStyle = bg
  g.fill()
  g.fillStyle = fg
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, cx, y + h / 2 + size * 0.04)
}

export async function drawStory(canvas: HTMLCanvasElement, d: StoryData) {
  canvas.width = STORY_W
  canvas.height = STORY_H
  const g = canvas.getContext('2d')!
  try {
    await Promise.all([document.fonts.load('800 80px Poppins'), document.fonts.load('600 40px Poppins'), document.fonts.load('700 40px Poppins')])
  } catch {
    // sem a fonte, usa a do sistema
  }
  const pose = d.pose != null && d.pose < POSES.length ? d.pose : poseFor(`${d.name}|${d.score}|${d.books}`)
  const [logo, lumis] = await Promise.all([loadImg(LOGO_BRANCO), loadImg(POSES[pose])])
  const W = STORY_W
  const cx = W / 2

  // fundo: azul para roxo, com brilho rosa no alto
  const bg = g.createLinearGradient(0, 0, 0, STORY_H)
  bg.addColorStop(0, '#2F6FE8')
  bg.addColorStop(0.55, '#6D5CF0')
  bg.addColorStop(1, '#8B5CF6')
  g.fillStyle = bg
  g.fillRect(0, 0, W, STORY_H)
  const glow = g.createRadialGradient(cx, 780, 60, cx, 780, 620)
  glow.addColorStop(0, 'rgba(254,220,105,0.55)')
  glow.addColorStop(1, 'rgba(254,220,105,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, STORY_H)

  // confete de estrelas e livros nas cores da Lume (posições fixas)
  const deco: [number, number, number, string, number, 's' | 'b'][] = [
    [120, 420, 34, C.amarelo, 0.3, 's'], [950, 380, 28, C.rosa, -0.2, 's'], [90, 900, 70, C.verde, -0.25, 'b'],
    [990, 820, 64, C.laranja, 0.3, 'b'], [170, 1180, 22, C.rosa, 0.6, 's'], [930, 1150, 26, C.amarelo, -0.5, 's'],
    [880, 560, 52, C.rosa, 0.18, 'b'], [200, 620, 18, '#fff', 0.1, 's'], [820, 1010, 16, '#fff', 0.4, 's'],
  ]
  for (const [x, y, s, col, r, k] of deco) (k === 's' ? star : book)(g, x, y, s, col, r)

  // faixa colorida da marca no alto
  const stripes = [C.rosa, C.laranja, C.amarelo, C.verde, C.azul, C.roxo]
  stripes.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect((i * W) / 6, 0, W / 6 + 1, 18)
  })

  // logo e título
  const lw = 300
  g.drawImage(logo, cx - lw / 2, 150, lw, (logo.height / logo.width) * lw)
  pill(g, cx, 300, 'LUMIS RUN 3D', 'rgba(255,255,255,0.18)', '#fff', 34, 40)

  // Lumis: uma das imagens oficiais, encaixada numa área de 820 x 620
  // as poses da folha são menores: aumenta no máximo 1,8× para não borrar
  const fit = Math.min(820 / lumis.width, 620 / lumis.height, lumis.width < 500 ? 1.8 : 9)
  const lwid = lumis.width * fit
  const lh = lumis.height * fit
  g.save()
  g.imageSmoothingQuality = 'high'
  g.shadowColor = 'rgba(15,23,42,0.3)'
  g.shadowBlur = 44
  g.shadowOffsetY = 20
  g.drawImage(lumis, cx - lwid / 2, 420 + (620 - lh), lwid, lh)
  g.restore()

  // nome
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  g.fillStyle = '#fff'
  const title = d.name ? d.name : 'Eu joguei!'
  fitFont(g, title, 800, 84, W - 160)
  g.fillText(title, cx, 1140)
  g.font = '600 38px Poppins, system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.88)'
  g.fillText(d.name ? 'correu com a Lumis pela escola' : 'Corri com a Lumis pela escola', cx, 1200)

  // cartão de resultado
  const cardX = 90
  const cardY = 1250
  const cardW = W - 180
  const hasPos = d.posScore != null || d.posBooks != null
  const cardH = hasPos ? 400 : 300
  g.save()
  g.shadowColor = 'rgba(15,23,42,0.3)'
  g.shadowBlur = 40
  g.shadowOffsetY = 16
  roundRect(g, cardX, cardY, cardW, cardH, 48)
  g.fillStyle = '#fff'
  g.fill()
  g.restore()

  // pontos | livros
  const colL = cardX + cardW * 0.28
  const colR = cardX + cardW * 0.74
  g.fillStyle = C.tinta
  fitFont(g, fmt(d.score), 800, 120, cardW * 0.5)
  g.fillText(fmt(d.score), colL, cardY + 160)
  g.font = '600 34px Poppins, system-ui, sans-serif'
  g.fillStyle = C.tinta2
  g.fillText('pontos', colL, cardY + 210)
  g.fillStyle = '#E2E8F0'
  g.fillRect(cardX + cardW * 0.53, cardY + 55, 3, 170)
  book(g, colR - 78, cardY + 118, 74, C.azul, -0.12)
  g.fillStyle = C.tinta
  g.font = '800 96px Poppins, system-ui, sans-serif'
  g.textAlign = 'left'
  g.fillText(fmt(d.books), colR - 24, cardY + 152)
  g.textAlign = 'center'
  g.font = '600 34px Poppins, system-ui, sans-serif'
  g.fillStyle = C.tinta2
  g.fillText(d.books === 1 ? 'livro' : 'livros', colR, cardY + 210)

  if (hasPos) {
    const y = cardY + 268
    if (d.posScore != null && d.posBooks != null) {
      pill(g, cardX + cardW * 0.27, y, `${d.posScore}º em pontos`, d.posScore === 1 ? C.amarelo : '#EFF6FF', d.posScore === 1 ? C.tinta : C.azul, 34, 30, 84)
      pill(g, cardX + cardW * 0.73, y, `${d.posBooks}º em livros`, d.posBooks === 1 ? C.amarelo : '#FDF2F8', d.posBooks === 1 ? C.tinta : '#DB2777', 34, 30, 84)
    } else {
      const p = d.posScore ?? d.posBooks!
      pill(g, cx, y, `${p}º no ranking`, C.amarelo, C.tinta, 34, 40, 84)
    }
  }

  // rodapé
  g.textAlign = 'center'
  g.fillStyle = '#fff'
  g.font = '700 40px Poppins, system-ui, sans-serif'
  g.fillText('Venha jogar no stand da Lume', cx, 1780)
  g.font = '600 32px Poppins, system-ui, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.fillText('South Tech Summit', cx, 1830)
  return canvas
}

export function storyBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('sem imagem'))), 'image/png'))
}
