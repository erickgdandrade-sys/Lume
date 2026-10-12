import { laneRequirements } from '../src/features/lumis-run/core/generator'
import { OBSTACLES } from '../src/features/lumis-run/core/obstacles'
import { command, type Command, type SimState } from '../src/features/lumis-run/core/sim'

/**
 * Jogador automático usado nos testes: lê a próxima fileira de obstáculos,
 * escolhe a faixa de saída mais próxima e pula/desliza na hora certa.
 * Se ele morre, a pista gerada (ou a física) tem um trecho impossível.
 */
export function botTick(s: SimState, log?: [number, Command][]) {
  const cmd = (c: Command) => {
    log?.push([s.tick, c])
    command(s, c)
  }
  const obs = s.gen.obstacles.filter((o) => o.d + OBSTACLES[o.kind].depth / 2 + 0.35 > s.distance)
  if (!obs.length) return
  const d = obs[0].d
  const row = obs.filter((o) => Math.abs(o.d - d) < 0.01)
  const req = laneRequirements(row)
  const order = [s.lane, s.lane - 1, s.lane + 1, s.lane - 2, s.lane + 2].filter((l) => l >= 0 && l <= 2)
  const target = order.find((l) => req[l] === 'livre') ?? order.find((l) => req[l] !== 'bloq')!
  if (target !== s.lane) cmd(target < s.lane ? 'left' : 'right')
  const tta = (d - s.distance) / s.speed
  if (req[target] === 'pular' && tta <= 0.31 && tta > 0 && (s.action === 'run' || s.action === 'land' || s.action === 'slide')) cmd('jump')
  if (req[target] === 'deslizar' && tta <= 0.22 && tta > 0 && s.action !== 'slide' && s.action !== 'dive') cmd('slide')
}
