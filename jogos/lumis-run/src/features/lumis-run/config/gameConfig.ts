// Parâmetros do jogo num só lugar. Valores iniciais, ajustáveis após testes.
export const LANES = {
  count: 3,
  width: 2.2, // distância entre os centros das faixas (m)
} as const

export const laneX = (lane: number) => (lane - 1) * LANES.width

export const CORRIDOR = {
  width: 9.6, // de parede a parede (m)
  height: 4.4,
  segmentLength: 16,
  segmentsAhead: 8, // quantos segmentos ficam visíveis à frente
  segmentsBehind: 1,
} as const

export const LUMIS = {
  radius: 0.62, // raio externo da estrela (m)
  thickness: 0.52,
  hoverHeight: 0.95, // altura do centro em corrida
} as const

export const CAMERA = {
  fovLandscape: 58,
  fovPortrait: 72,
  run: { height: 2.9, distance: 5.8, lookAhead: 7, lookHeight: 1.1, followX: 0.55 },
  menu: { height: 1.35, distance: 3.6, lookHeight: 1.05 },
  smoothing: 6, // quanto maior, mais rápido a câmera alcança o alvo (1/s)
} as const

export const SIM = {
  stepHz: 120,
  maxFrameDelta: 0.1, // teto do tempo de um quadro (s); evita saltos após travadas ou aba oculta
} as const

export const PREVIEW_SPEED = {
  menu: 3,
  run: 11,
} as const

export const FOG = { near: 28, far: 115 } as const
