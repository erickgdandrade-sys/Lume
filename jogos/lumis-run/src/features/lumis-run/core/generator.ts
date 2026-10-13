import { bookRulesAt, DIFFICULTY, gapTimeAt, speedAt, tierWeightsAt, type TierWeights } from '../config/difficulty'
import { clearZone, levelAtDistance } from './levels'
import { OBSTACLES, type Book, type Obstacle, type ObstacleKind } from './obstacles'

/**
 * Gerador procedural de fileiras de obstáculos e livros.
 * Toda escolha usa o PRNG da partida, então a mesma semente gera a mesma pista.
 * Antes de aceitar uma fileira, verifica se existe saída a partir de qualquer
 * faixa que o jogador possa estar ocupando depois da fileira anterior.
 */
export type LaneReq = 'livre' | 'pular' | 'deslizar' | 'bloq'
type Item = { kind: ObstacleKind; lane: number }

const ONE_LANE_LOW: ObstacleKind[] = ['livros', 'carteira']
const ONE_LANE_TALL: ObstacleKind[] = ['caixas', 'carrinho']

export const REACTION = 0.28 // s mínimos para reagir a uma nova fileira
export const LANE_TIME = 0.16 // s por faixa trocada
export const LAND_TIME = 0.42 // s para aterrissar antes de outra ação

export function laneRequirements(items: Item[]): LaneReq[] {
  const req: LaneReq[] = ['livre', 'livre', 'livre']
  for (const it of items) {
    const spec = OBSTACLES[it.kind]
    const r: LaneReq = spec.clear === 'nenhum' ? 'bloq' : spec.clear
    const lanes = spec.span === 'todas' ? [0, 1, 2] : [it.lane]
    for (const l of lanes) {
      if (req[l] === 'bloq' || r === 'bloq') req[l] = 'bloq'
      else if (req[l] === 'livre') req[l] = r
      else if (req[l] !== r) req[l] = 'bloq' // exigências incompatíveis na mesma faixa
    }
  }
  return req
}

/** tempo necessário para sair da faixa k (exigência a) e passar pela faixa j (exigência b) */
export function transitionTime(k: number, a: LaneReq, j: number, b: LaneReq) {
  let t = REACTION + LANE_TIME * Math.abs(j - k)
  if (a === 'pular' && b !== 'livre') t += LAND_TIME
  return t
}

export function rowIsFeasible(prev: LaneReq[], next: LaneReq[], gapTime: number) {
  if (!next.some((r) => r !== 'bloq')) return false
  for (let k = 0; k < 3; k++) {
    if (prev[k] === 'bloq') continue
    let ok = false
    for (let j = 0; j < 3 && !ok; j++) {
      if (next[j] === 'bloq') continue
      if (transitionTime(k, prev[k], j, next[j]) <= gapTime) ok = true
    }
    if (!ok) return false
  }
  return true
}

const pick = <T,>(rng: () => number, arr: readonly T[]) => arr[Math.floor(rng() * arr.length)]
const shuffleLanes = (rng: () => number) => {
  const l = [0, 1, 2]
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[l[i], l[j]] = [l[j], l[i]]
  }
  return l
}

export function makeRow(tier: number, rng: () => number): Item[] {
  const [a, b, c] = shuffleLanes(rng)
  if (tier === 0) {
    const r = rng()
    if (r < 0.8) return [{ kind: pick(rng, [...ONE_LANE_LOW, ...ONE_LANE_TALL]), lane: a }]
    return [{ kind: 'barreira', lane: 1 }]
  }
  if (tier === 1) {
    const r = rng()
    if (r < 0.4) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }]
    if (r < 0.65) return [{ kind: 'faixa', lane: 1 }]
    if (r < 0.85) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_LOW), lane: b }]
    return [{ kind: 'barreira', lane: 1 }]
  }
  if (tier === 2) {
    const r = rng()
    if (r < 0.4) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }]
    if (r < 0.6) return [{ kind: pick(rng, ONE_LANE_LOW), lane: a }, { kind: pick(rng, ONE_LANE_LOW), lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }]
    if (r < 0.72) return [{ kind: 'faixa', lane: 1 }]
    if (r < 0.86) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: 'placa', lane: b }]
    return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }]
  }
  // caminhos difíceis: uma única saída, ou saídas que pedem ações diferentes
  const r = rng()
  if (r < 0.3) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: pick(rng, ONE_LANE_TALL), lane: b }, { kind: 'placa', lane: c }]
  if (r < 0.6) return [{ kind: pick(rng, ONE_LANE_TALL), lane: a }, { kind: 'placa', lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }]
  if (r < 0.8) return [{ kind: 'placa', lane: a }, { kind: 'placa', lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }]
  return [{ kind: 'placa', lane: a }, { kind: pick(rng, ONE_LANE_LOW), lane: b }, { kind: pick(rng, ONE_LANE_LOW), lane: c }]
}

function pickTier(w: TierWeights, rng: () => number) {
  let r = rng() * (w[0] + w[1] + w[2] + w[3])
  for (let i = 0; i < 3; i++) {
    if (r < w[i]) return i
    r -= w[i]
  }
  return 3
}

export interface GenState {
  rng: () => number
  nextD: number
  prevReq: LaneReq[]
  prevD: number
  ids: number
  obstacles: Obstacle[]
  books: Book[]
}

export function createGen(rng: () => number): GenState {
  return { rng, nextD: DIFFICULTY.warmupDistance, prevReq: ['livre', 'livre', 'livre'], prevD: 0, ids: 1, obstacles: [], books: [] }
}

function addBookLine(g: GenState, lane: number, d0: number, d1: number, y: number, max = 6) {
  const n = Math.max(2, Math.min(max, Math.floor((d1 - d0) / 2.2)))
  for (let i = 0; i < n; i++) {
    const d = d0 + ((d1 - d0) * i) / Math.max(1, n - 1)
    g.books.push({ id: g.ids++, lane, d, y, taken: false, color: Math.floor(g.rng() * 6) })
  }
}

/** livros de boas-vindas no aquecimento */
export function warmupBooks(g: GenState) {
  addBookLine(g, 1, 14, 30, 1.0)
}

/**
 * Gera fileiras até a distância `ahead`. `t` é o tempo de corrida atual,
 * usado para escolher velocidade, espaçamento e complexidade.
 */
export function fillUntil(g: GenState, ahead: number, t: number) {
  while (g.nextD < ahead) {
    const speed = speedAt(t)
    const gapTime = gapTimeAt(t)
    // trecho livre para a Lumis atravessar a janela do próximo nível
    const level = levelAtDistance(g.nextD)
    const [z0, z1] = clearZone(level + 1, speedAt(t + 14))
    const [, c1] = level > 1 ? clearZone(level, speedAt(t + 14)) : [0, 0]
    const zoneEnd = g.nextD >= z0 ? z1 : g.nextD < c1 ? c1 : 0
    if (zoneEnd) {
      g.nextD = zoneEnd
      g.prevD = zoneEnd - 30
      g.prevReq = ['livre', 'livre', 'livre']
      continue
    }
    const gap = g.nextD - g.prevD
    const tier = pickTier(tierWeightsAt(t), g.rng)
    let items: Item[] | null = null
    let req: LaneReq[] = []
    for (let attempt = 0; attempt < 12 && !items; attempt++) {
      const cand = makeRow(attempt < 8 ? tier : 0, g.rng)
      const r = laneRequirements(cand)
      if (rowIsFeasible(g.prevReq, r, gap / speed)) {
        items = cand
        req = r
      }
    }
    if (!items) {
      // nenhuma fileira cabe nesse espaço: avança sem obstáculo
      g.nextD += Math.max(2, gap * 0.5)
      g.prevReq = ['livre', 'livre', 'livre']
      continue
    }
    const d = g.nextD
    for (const it of items) g.obstacles.push({ id: g.ids++, kind: it.kind, lane: it.lane, d, variant: Math.floor(g.rng() * 4) })
    addBooks(g, req, d, gap, bookRulesAt(level))

    g.books.sort((a, b) => a.d - b.d)
    g.prevReq = req
    g.prevD = d
    g.nextD = d + gapTime * speed * (1 + g.rng() * 0.4)
  }
}

/**
 * Livros de uma fileira. Nos primeiros níveis: trilha na faixa de saída ou
 * arco por cima do obstáculo. Depois, ficam mais raros e mais arriscados.
 */
function addBooks(g: GenState, req: LaneReq[], d: number, gap: number, rules: ReturnType<typeof bookRulesAt>) {
  if (g.rng() >= rules.chance) return
  const open = [0, 1, 2].filter((l) => req[l] !== 'bloq')
  const risky = g.rng() < rules.risky
  // arriscado: prefere a faixa que pede pulo ou deslize
  const action = open.filter((l) => req[l] !== 'livre')
  const pool = risky && action.length ? action : open
  const lane = pool[Math.floor(g.rng() * pool.length)]
  const r = req[lane]
  const color = () => Math.floor(g.rng() * 6)
  if (r === 'pular') {
    if (risky) g.books.push({ id: g.ids++, lane, d, y: 2.45, taken: false, color: color() })
    else {
      g.books.push({ id: g.ids++, lane, d: d - 2.2, y: 1.9, taken: false, color: color() })
      g.books.push({ id: g.ids++, lane, d, y: 2.45, taken: false, color: color() })
      g.books.push({ id: g.ids++, lane, d: d + 2.2, y: 1.9, taken: false, color: color() })
    }
  } else if (r === 'deslizar') {
    if (risky) g.books.push({ id: g.ids++, lane, d, y: 0.45, taken: false, color: color() })
    else addBookLine(g, lane, d - 1.5, d + 1.5, 0.45)
  } else if (risky) {
    // livro no alto, bem ao lado dos obstáculos: precisa pular na hora certa
    g.books.push({ id: g.ids++, lane, d, y: 2.3, taken: false, color: color() })
  } else {
    addBookLine(g, lane, d - Math.min(10, gap * 0.6), d + 1, 1.0, rules.maxLine)
  }
}

/** descarta o que ficou para trás da câmera */
export function prune(g: GenState, distance: number) {
  const limit = distance - 8
  if (g.obstacles.length && g.obstacles[0].d < limit) g.obstacles = g.obstacles.filter((o) => o.d >= limit)
  if (g.books.length && g.books[0].d < limit) g.books = g.books.filter((b) => b.d >= limit)
}
