import * as THREE from 'three'
import { CORRIDOR } from '../../config/gameConfig'
import { SCENARIO_COUNT } from '../../core/levels'
import { artes } from './artes'
import { biblioteca } from './biblioteca'
import { corredor } from './corredor'
import { formatura } from './formatura'
import { horta } from './horta'
import { laboratorio } from './laboratorio'
import { parquinho } from './parquinho'
import { quadra } from './quadra'
import { refeitorio } from './refeitorio'
import { rua } from './rua'
import type { SidePiece } from './kit'
import type { ScenarioDef } from './types'

/** um cenário por nível, na ordem; do nível 11 em diante eles se repetem */
export const SCENARIOS: ScenarioDef[] = [corredor, rua, quadra, biblioteca, laboratorio, refeitorio, artes, horta, parquinho, formatura]

export const scenarioDef = (i: number) => SCENARIOS[i % SCENARIOS.length]

export interface ScenarioAssets {
  def: ScenarioDef
  floorMat: THREE.MeshStandardMaterial
  common: SidePiece
  sides: Record<'-1' | '1', SidePiece[]>
}

const cache = new Map<number, ScenarioAssets>()

/** geometrias e materiais de um cenário, criados na primeira vez que ele aparece */
export function scenarioAssets(i: number): ScenarioAssets {
  const key = i % SCENARIO_COUNT
  let a = cache.get(key)
  if (!a) {
    const def = scenarioDef(key)
    const tex = def.floor()
    tex.repeat.set(CORRIDOR.width / 4, CORRIDOR.segmentLength / 4)
    a = {
      def,
      floorMat: new THREE.MeshStandardMaterial({ map: tex, roughness: def.floorRoughness }),
      common: def.common(),
      sides: { '-1': def.sides.map((f) => f(-1)), '1': def.sides.map((f) => f(1)) },
    }
    cache.set(key, a)
  }
  return a
}

/** prepara os cenários restantes aos poucos, sem travar a corrida */
export function prewarmScenarios(onEach?: () => void) {
  let i = 0
  const next = () => {
    if (i >= SCENARIO_COUNT) return
    scenarioAssets(i++)
    onEach?.()
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback
    if (ric) ric(next, { timeout: 400 })
    else setTimeout(next, 30)
  }
  next()
}
