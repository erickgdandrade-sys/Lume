import * as THREE from 'three'
import { CORRIDOR } from '../../config/gameConfig'
import { GeoBuilder } from '../geoBuilder'

/**
 * Peças e utilidades comuns aos cenários. Cada pedaço de cenário vira três
 * geometrias (opaca com cor por vértice, emissiva e vidro), desenhadas com
 * materiais compartilhados: poucas chamadas de desenho por segmento.
 */
export type SidePiece = { opaque: THREE.BufferGeometry; emissive: THREE.BufferGeometry; glass: THREE.BufferGeometry }
export type B = { o: GeoBuilder; e: GeoBuilder; g: GeoBuilder }
export type V3 = [number, number, number]

export const L: number = CORRIDOR.segmentLength
export const HW: number = CORRIDOR.width / 2
export const H: number = CORRIDOR.height

export const builders = (): B => ({ o: new GeoBuilder(), e: new GeoBuilder(), g: new GeoBuilder() })

export const shade = (c: string, k: number) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString()
export const mix = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString()

/**
 * Oclusão de ambiente barata: escurece os vértices perto do chão (onde os
 * objetos encostam) e, em ambientes fechados, perto do teto. Dá peso e
 * profundidade ao cenário sem custo na hora de desenhar.
 */
function bakeAO(geo: THREE.BufferGeometry, ceiling: number | null) {
  const pos = geo.getAttribute('position')
  const col = geo.getAttribute('color')
  if (!pos || !col) return
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    let k = 1 - 0.32 * Math.exp(-Math.max(0, y) / 0.32)
    if (ceiling != null) k *= 1 - 0.1 * Math.exp(-Math.max(0, ceiling - y) / 0.5)
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k)
  }
  col.needsUpdate = true
}

export function finish(b: B, ceiling: number | null = H): SidePiece {
  const opaque = b.o.build()
  bakeAO(opaque, ceiling)
  return { opaque, emissive: b.e.build(), glass: b.g.build() }
}

export const empty = (): SidePiece => finish(builders())

/** textura de canvas repetível, com cor no espaço sRGB */
export function canvasTexture(px: number, draw: (g: CanvasRenderingContext2D, px: number) => void, repeat = true) {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')!
  draw(g, px)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

/** granulado sutil: tira o aspecto "plástico" das superfícies lisas */
export function grain(g: CanvasRenderingContext2D, px: number, amount = 0.06, seed = 1) {
  let s = seed >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const img = g.getImageData(0, 0, px, px)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = 1 + (rnd() - 0.5) * 2 * amount
    d[i] = Math.min(255, d[i] * n)
    d[i + 1] = Math.min(255, d[i + 1] * n)
    d[i + 2] = Math.min(255, d[i + 2] * n)
  }
  g.putImageData(img, 0, 0)
}

/** manchas grandes e suaves (desgaste, sujeira, variação de tom) */
export function blotches(g: CanvasRenderingContext2D, px: number, color: string, count: number, seed = 7) {
  let s = seed >>> 0
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < count; i++) {
    const x = rnd() * px
    const y = rnd() * px
    const r = px * (0.05 + rnd() * 0.15)
    for (const [dx, dy] of [[0, 0], [px, 0], [-px, 0], [0, px], [0, -px]]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      grad.addColorStop(0, color)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
    }
  }
}

/** parede lisa entre z0 e z1 (z0 > z1) num lado, com rodapé e meia-parede opcional */
export function wall(
  b: B,
  side: number,
  z0: number,
  z1: number,
  c: { wall: string; lower?: string; trim?: string; base?: string },
  y0 = 0,
  y1 = H,
  split = 1.05,
) {
  const T = 0.3
  const len = z0 - z1
  const zc = (z0 + z1) / 2
  const x = side * (HW + T / 2)
  const lower = c.lower ?? c.wall
  if (y0 < split) {
    const top = Math.min(split, y1)
    b.o.box(T, top - y0, len, lower, [x, (y0 + top) / 2, zc])
  }
  if (y1 > split) {
    const bot = Math.max(split, y0)
    b.o.box(T, y1 - bot, len, c.wall, [x, (bot + y1) / 2, zc])
  }
  if (y0 === 0 && c.base) b.o.box(0.06, 0.14, len, c.base, [side * (HW - 0.03), 0.07, zc])
  if (c.trim && y0 <= split && y1 >= split) b.o.box(0.05, 0.06, len, c.trim, [side * (HW - 0.025), split, zc])
}

/** teto plano com sanca, para os ambientes fechados */
export function ceiling(b: B, color: string, trim: string, h = H) {
  b.o.box(CORRIDOR.width + 0.6, 0.2, L, color, [0, h + 0.1, -L / 2])
  for (const side of [-1, 1]) b.o.box(0.18, 0.12, L, trim, [side * (HW - 0.09), h - 0.06, -L / 2])
}

/** luminária de teto: moldura opaca e painel emissivo */
export function ceilingLight(b: B, x: number, z: number, frame: string, panel: string, w = 1.9, d = 0.9, h = H) {
  b.o.box(w, 0.05, d, frame, [x, h - 0.02, z])
  b.e.box(w - 0.2, 0.03, d - 0.2, panel, [x, h - 0.05, z])
}

/** árvore estilizada: tronco e copa com três esferas */
export function tree(b: B, x: number, z: number, s = 1, leaf = '#4C9A5B', trunk = '#7A5236', r: () => number = Math.random) {
  b.o.cyl(0.12 * s, 0.17 * s, 2.0 * s, trunk, [x, 1.0 * s, z], undefined, 8)
  const l2 = shade(leaf, 0.82)
  const l3 = mix(leaf, '#C8E06A', 0.25)
  b.o.sphere(1.05 * s, leaf, [x, 2.55 * s, z], [1, 0.9, 1])
  b.o.sphere(0.75 * s, l2, [x + 0.55 * s, 2.25 * s + r() * 0.2, z + 0.35 * s])
  b.o.sphere(0.7 * s, l3, [x - 0.45 * s, 2.95 * s, z - 0.3 * s])
}

/** arbusto baixo */
export function bush(b: B, x: number, z: number, s = 1, color = '#4E9B58') {
  b.o.sphere(0.5 * s, color, [x, 0.38 * s, z], [1.3, 0.8, 1])
  b.o.sphere(0.38 * s, shade(color, 0.85), [x + 0.4 * s, 0.32 * s, z + 0.2 * s], [1.2, 0.85, 1])
}

/** poste de luz de rua */
export function streetLamp(b: B, x: number, z: number, side: number, pole = '#3F4A5C', bulb = '#FFE7A8') {
  b.o.cyl(0.06, 0.09, 4.6, pole, [x, 2.3, z], undefined, 8)
  b.o.box(0.08, 0.08, 1.0, pole, [x - side * 0.45, 4.55, z], [0, Math.PI / 2, 0])
  b.o.box(0.5, 0.12, 0.3, pole, [x - side * 0.9, 4.5, z])
  b.e.box(0.4, 0.04, 0.22, bulb, [x - side * 0.9, 4.43, z])
}

/** banco de praça */
export function parkBench(b: B, x: number, z: number, side: number, wood = '#B9844F', metal = '#3F4A5C') {
  for (const dz of [-0.75, 0.75]) b.o.box(0.5, 0.45, 0.06, metal, [x, 0.22, z + dz])
  for (let i = 0; i < 3; i++) b.o.box(0.14, 0.05, 1.8, wood, [x - side * (0.15 - i * 0.15), 0.47, z])
  for (let i = 0; i < 2; i++) b.o.box(0.05, 0.12, 1.8, wood, [x + side * 0.24, 0.65 + i * 0.16, z])
}

/** cerca de ripas */
export function picketFence(b: B, x: number, z0: number, z1: number, color = '#F1E6D2', h = 0.9) {
  const len = z0 - z1
  b.o.box(0.05, 0.07, len, color, [x, h * 0.3, (z0 + z1) / 2])
  b.o.box(0.05, 0.07, len, color, [x, h * 0.75, (z0 + z1) / 2])
  for (let z = z0 - 0.15; z > z1; z -= 0.32) {
    b.o.box(0.04, h, 0.12, color, [x, h / 2, z])
    b.o.add(new THREE.ConeGeometry(0.085, 0.12, 4), color, [x, h + 0.06, z], [0, Math.PI / 4, 0])
  }
}

/** sinal/placa com texto num canvas (usado na fachada da transição) */
export function textTexture(text: string, bg: string, fg: string, w = 1024, h = 192) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.beginPath()
  g.roundRect(6, 6, w - 12, h - 12, h * 0.24)
  g.fill()
  g.fillStyle = fg
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let size = h * 0.5
  g.font = `800 ${size}px Poppins, system-ui, sans-serif`
  while (g.measureText(text).width > w * 0.86 && size > 20) {
    size -= 4
    g.font = `800 ${size}px Poppins, system-ui, sans-serif`
  }
  g.fillText(text, w / 2, h / 2 + size * 0.04)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}
