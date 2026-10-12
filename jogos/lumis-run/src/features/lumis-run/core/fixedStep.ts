import { SIM } from '../config/gameConfig'

export const STEP = 1 / SIM.stepHz

/**
 * Acumulador de passo fixo. Recebe o tempo real de cada quadro e devolve
 * quantos passos de simulação executar, mais a fração para interpolar.
 * O tempo de cada quadro tem teto, então uma aba em segundo plano ou uma
 * travada nunca gera um salto grande de simulação (nem de pontuação).
 */
export class FixedStepper {
  private acc = 0

  advance(frameDelta: number): { steps: number; alpha: number } {
    const dt = Math.min(Math.max(frameDelta, 0), SIM.maxFrameDelta)
    this.acc += dt
    let steps = 0
    while (this.acc >= STEP) {
      this.acc -= STEP
      steps++
    }
    return { steps, alpha: this.acc / STEP }
  }

  reset() {
    this.acc = 0
  }
}
