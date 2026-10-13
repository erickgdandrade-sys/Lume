import * as THREE from 'three'
import { LUMIS } from '../config/gameConfig'

/** proporções da estrela ajustadas ao contorno das imagens oficiais da Lumis */
export const STAR_SHAPE = { innerRatio: 0.68, tipPower: 1.2 } as const

/**
 * Lumis conforme o modelo oficial: estrela "almofadada", grossa no centro,
 * com pontas curtas e arredondadas que afinam nas extremidades.
 * A malha é gerada em anéis concêntricos sobre o contorno da estrela; a
 * espessura em cada ponto segue um perfil de domo, o que dá o volume macio.
 */
export function createStarOutline(R: number = LUMIS.radius, innerRatio = STAR_SHAPE.innerRatio, samplesPerCorner = 14) {
  // contorno medido nas imagens oficiais: r(φ) = Rin + (R − Rin)·t^q, com
  // t = (1 + cos 5(φ − 90°)) / 2. Pontas curtas, gordinhas e arredondadas e
  // cantos internos macios, sem trechos retos.
  const shape = new THREE.Shape()
  const N = 720
  for (let k = 0; k <= N; k++) {
    const phi = Math.PI / 2 + (k / N) * Math.PI * 2
    const t = (1 + Math.cos(5 * (phi - Math.PI / 2))) / 2
    const r = R * innerRatio + R * (1 - innerRatio) * Math.pow(t, STAR_SHAPE.tipPower)
    const x = Math.cos(phi) * r
    const y = Math.sin(phi) * r
    if (k === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  // pontos espaçados por comprimento, para a malha ficar regular
  return shape.getSpacedPoints(samplesPerCorner * 10).slice(0, -1)
}

/** espessura (meia) em um ponto, dado o parâmetro radial s (0 centro, 1 borda) e o raio real r */
export function puffZ(s: number, r: number, R: number, thickness: number) {
  const dome = Math.sqrt(Math.max(0, 1 - Math.pow(s, 2.4)))
  const taper = 1 - 0.42 * Math.pow(Math.min(1, r / R), 1.6)
  return (thickness / 2) * dome * taper
}

export function createStarGeometry(R: number = LUMIS.radius, thickness: number = LUMIS.thickness) {
  const outline = createStarOutline(R)
  const M = outline.length
  const K = 16 // anéis do centro até a borda
  const rings: number[] = []
  for (let j = 0; j <= K; j++) rings.push(Math.sin(((j / K) * Math.PI) / 2))

  const positions: number[] = []
  // frente: centro (anel 0) até a borda; verso: borda até o centro
  const sides = [1, -1]
  const vIndex = (side: number, j: number, i: number) => {
    // anel de borda (j = K) é compartilhado entre frente e verso
    if (j === K) return 1 + (K - 1) * M + i
    if (j === 0) return side === 1 ? 0 : 1 + (K - 1) * M + M + (K - 1) * M
    const base = side === 1 ? 1 : 1 + (K - 1) * M + M
    return base + (j - 1) * M + i
  }
  // centro frontal
  positions.push(0, 0, puffZ(0, 0, R, thickness))
  for (let j = 1; j < K; j++) {
    for (let i = 0; i < M; i++) {
      const p = outline[i]
      const s = rings[j]
      const r = p.length() * s
      positions.push(p.x * s, p.y * s, puffZ(s, r, R, thickness))
    }
  }
  for (let i = 0; i < M; i++) positions.push(outline[i].x, outline[i].y, 0)
  for (let j = 1; j < K; j++) {
    for (let i = 0; i < M; i++) {
      const p = outline[i]
      const s = rings[j]
      const r = p.length() * s
      positions.push(p.x * s, p.y * s, -puffZ(s, r, R, thickness))
    }
  }
  positions.push(0, 0, -puffZ(0, 0, R, thickness))

  const idx: number[] = []
  for (const side of sides) {
    for (let i = 0; i < M; i++) {
      const i2 = (i + 1) % M
      const c = vIndex(side, 0, 0)
      const a = vIndex(side, 1, i)
      const b = vIndex(side, 1, i2)
      if (side === 1) idx.push(c, a, b)
      else idx.push(c, b, a)
    }
    for (let j = 1; j < K; j++) {
      for (let i = 0; i < M; i++) {
        const i2 = (i + 1) % M
        const a = vIndex(side, j, i)
        const b = vIndex(side, j, i2)
        const c = vIndex(side, j + 1, i)
        const d = vIndex(side, j + 1, i2)
        if (side === 1) idx.push(a, c, b, b, c, d)
        else idx.push(a, b, c, b, d, c)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return { geo, frontZ: (thickness / 2) * 1 }
}

/** Altura da superfície frontal num ponto (x, y) do rosto, para assentar olhos e boca. */
export function surfaceZ(x: number, y: number, R: number = LUMIS.radius, thickness: number = LUMIS.thickness) {
  // aproximação: usa o raio interno da estrela como borda nessa direção
  const r = Math.hypot(x, y)
  const edge = R * STAR_SHAPE.innerRatio
  return puffZ(Math.min(1, r / edge), r, R, thickness)
}

/** Textura radial suave usada no brilho e na sombra projetada. */
export function radialTexture(inner: string, outer: string, size = 128) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
