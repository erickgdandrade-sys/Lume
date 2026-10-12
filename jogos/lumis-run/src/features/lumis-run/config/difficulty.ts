/**
 * Curva de dificuldade em função do tempo de corrida ativo (s).
 * Cada parâmetro sobe em momentos diferentes, nunca todos de uma vez,
 * e todos têm teto. Valores iniciais, ajustáveis após testes no stand.
 */
export const DIFFICULTY = {
  maxSpeed: 24,
  speedKeys: [
    [0, 11],
    [20, 11],
    [45, 14],
    [75, 17],
    [120, 20],
    [220, 24],
  ] as [number, number][],
  // tempo mínimo entre fileiras de obstáculos (s): cai devagar até um piso
  gapKeys: [
    [0, 1.25],
    [30, 1.1],
    [60, 0.95],
    [100, 0.82],
    [160, 0.72],
  ] as [number, number][],
  // pesos dos níveis de padrão [tier1, tier2, tier3]
  tierKeys: [
    [0, [1, 0, 0]],
    [15, [0.75, 0.25, 0]],
    [45, [0.45, 0.45, 0.1]],
    [75, [0.3, 0.45, 0.25]],
    [120, [0.2, 0.4, 0.4]],
  ] as [number, [number, number, number]][],
  // chance de colocar livros antes de cada fileira
  bookKeys: [
    [0, 0.9],
    [60, 0.75],
    [120, 0.6],
  ] as [number, number][],
  warmupDistance: 45, // metros iniciais sem obstáculos
} as const

function interp(keys: readonly (readonly [number, number])[], t: number) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]
    const [t0, v0] = keys[i - 1]
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
  }
  return keys[keys.length - 1][1]
}

export const speedAt = (t: number) => Math.min(DIFFICULTY.maxSpeed, interp(DIFFICULTY.speedKeys, t))
export const gapTimeAt = (t: number) => interp(DIFFICULTY.gapKeys, t)
export const bookChanceAt = (t: number) => interp(DIFFICULTY.bookKeys, t)

export function tierWeightsAt(t: number): [number, number, number] {
  const k = DIFFICULTY.tierKeys
  if (t <= k[0][0]) return [...k[0][1]]
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const f = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0])
      return [0, 1, 2].map((j) => k[i - 1][1][j] + (k[i][1][j] - k[i - 1][1][j]) * f) as [number, number, number]
    }
  }
  return [...k[k.length - 1][1]]
}

/** nível de 1 a 5, para o indicador do HUD */
export function levelAt(t: number) {
  return t < 20 ? 1 : t < 45 ? 2 : t < 75 ? 3 : t < 120 ? 4 : 5
}
