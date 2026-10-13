import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORRIDOR } from '../config/gameConfig'
import { scenarioOfLevel, visualLevelAt, visualStart } from '../core/levels'
import type { SimState } from '../core/sim'
import { MOVE } from '../core/sim'
import { session } from '../session'
import { useUi } from '../ui/uiStore'
import { AdaptiveQuality, QUALITY_LEVELS } from './AdaptiveQuality'
import { CameraRig } from './CameraRig'
import { Corridor } from './Corridor'
import { Atmosphere } from './Atmosphere'
import { Portal } from './Portal'
import { prewarmScenarios } from './scenery'
import { Lumis, type LumisDriver } from './Lumis'
import { computePose, LEAP, overlayTwirl, overlayWindow, TWIRL_TIME, type LumisMode } from './lumisPose'
import { Books } from './Books'
import { ContactShadows } from './ContactShadows'
import { Obstacles } from './Obstacles'
import { Sparkles } from './Sparkles'
import { LUMIS } from '../config/gameConfig'

/** Avança a sessão (simulação em passo fixo) antes de qualquer desenho do quadro. */
function SimDriver() {
  useFrame((_, dt) => session.update(dt), -1)
  return null
}

const getSim = () => session.sim
const getX = () => session.sim?.x ?? 0
const running = () => !!session.sim && session.phase !== 'idle'

/** cenário (0..9) do trecho que começa na distância da vista; o menu é sempre o corredor */
function sceneAt(viewD: number) {
  return running() ? scenarioOfLevel(visualLevelAt(viewD, session.viewOffset)) : 0
}

/** fachada da janela mais próxima: a próxima à frente ou a que acabou de passar */
function portalAt() {
  if (!running()) return null
  const view = session.viewDistance
  const lv = session.levelNow()
  for (const n of [lv + 1, lv]) {
    if (n < 2) continue
    const z = view - visualStart(n, session.viewOffset)
    if (z > -CORRIDOR.segmentLength * (CORRIDOR.segmentsAhead - 0.2) && z < 24) return { z, scene: scenarioOfLevel(n) }
  }
  return null
}

/** traduz o estado da simulação para a animação da Lumis */
function lumisDriver(): LumisDriver {
  let prevX = 0
  let lateral = 0
  let clock = 0
  let last = performance.now()
  let bookSeq = 0
  let bookT = 9
  const debug = { mode: 'menu' as LumisMode, wave: 0, overlay: '' }
  ;(globalThis as unknown as { __lumisPose?: object }).__lumisPose = debug
  return {
    read() {
      const now = performance.now()
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      clock += dt
      const s: SimState | null = session.sim
      const phase = session.phase
      if (!s || phase === 'idle') {
        const pose = computePose('menu', 0, clock)
        debug.mode = 'menu'
        debug.wave = pose.wave
        debug.overlay = ''
        return { pose, x: 0 }
      }
      const v = dt > 0 ? (s.x - prevX) / dt : 0
      prevX = s.x
      lateral += (Math.max(-1, Math.min(1, v / 25)) - lateral) * Math.min(1, dt * 18)
      let mode: LumisMode = 'run'
      let t = s.actionT
      const r = useUi.getState().result
      const o = r?.outcome
      // comemora o 1º lugar em algum ranking ou um novo recorde pessoal
      const record = !!o ? (o.improvedScore && o.previousBest != null) || o.posScore === 1 || o.posBooks === 1 : r?.preview?.posScore === 1 || r?.preview?.posBooks === 1
      if (phase === 'over' && record) {
        mode = 'celebrate'
        t = session.phaseClock
      } else if (s.action === 'impact' || phase === 'over' || phase === 'crashed') {
        mode = 'impact'
        t = session.phaseClock
      } else if (phase === 'countdown' && s.tick === 0) {
        // antes da largada: tchau para a câmera
        mode = 'greet'
        t = session.phaseClock
      } else if (s.action === 'jump' || s.action === 'dive') mode = 'jump'
      else if (s.action === 'land') mode = 'land'
      else if (s.action === 'slide') mode = 'slide'
      if (s.action === 'jump' && t > MOVE.jumpTime) t = MOVE.jumpTime
      const pose = computePose(mode, t, clock, lateral)
      // altura exata da simulação durante o salto (inclui a descida rápida)
      if (s.action === 'jump' || s.action === 'dive') pose.y = LUMIS.hoverHeight + s.air
      // animações por cima da corrida: pulo pela janela ao passar de nível, giro ao bater o recorde
      debug.overlay = ''
      const tr = phase === 'running' || phase === 'crashed' ? session.transition() : null
      if (tr && (mode === 'run' || mode === 'land') && !s.crashed) {
        overlayWindow(pose, tr.t)
        debug.overlay = tr.t < LEAP.end ? 'janela' : 'espanto'
      } else if (mode === 'run' && phase === 'running' && session.recordClock < TWIRL_TIME) {
        overlayTwirl(pose, session.recordClock)
        debug.overlay = 'giro'
      }
      // "pulinho" ao pegar um livro
      if (session.effect.seq !== bookSeq) {
        bookSeq = session.effect.seq
        if (session.effect.type === 'book') bookT = 0
      }
      bookT += dt
      if (bookT < 0.24) {
        const k = Math.sin((bookT / 0.24) * Math.PI) * 0.1
        pose.sx *= 1 + k
        pose.sy *= 1 + k
        pose.sz *= 1 + k
      }
      debug.mode = mode
      debug.wave = pose.wave
      return { pose, x: s.x }
    },
  }
}

/** Expõe contadores do renderizador para testes automatizados e diagnóstico. */
function RenderStats() {
  const acc = useRef(0)
  useFrame(({ gl }, dt) => {
    acc.current += dt
    if (acc.current < 1) return
    acc.current = 0
    const i = gl.info
    ;(window as unknown as { __lumisStats: object }).__lumisStats = {
      calls: i.render.calls,
      triangles: i.render.triangles,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
      programs: i.programs?.length ?? 0,
    }
  })
  return null
}

/** câmera perto da Lumis enquanto ela se espanta e acena depois da janela */
function closeUp() {
  if (session.phase !== 'running') return false
  const tr = session.transition()
  return !!tr && tr.t > LEAP.end - 0.05 && tr.t < LEAP.waveEnd - 0.1
}

function Scene() {
  const quality = useUi((s) => s.quality)
  const set = useUi((s) => s.set)
  const shadows = QUALITY_LEVELS[quality].shadows

  const driver = useMemo(lumisDriver, [])
  useEffect(() => prewarmScenarios(), [])

  return (
    <>
      <SimDriver />
      <RenderStats />
      <Atmosphere getX={getX} getScene={() => sceneAt(session.viewDistance)} shadows={shadows} hiRes={quality >= 3} />
      <Corridor getDistance={() => session.viewDistance} sceneAt={sceneAt} />
      <Portal get={portalAt} />
      <Obstacles getSim={getSim} />
      <ContactShadows getSim={getSim} />
      <Books getSim={getSim} />
      <Lumis driver={driver} />
      <Sparkles watch={() => ({ seq: session.effect.seq, x: session.effect.x, y: session.effect.y, crash: session.effect.type === 'crash' })} />
      <CameraRig
        read={() => ({
          mode: session.phase === 'idle' ? 'menu' : (session.phase === 'countdown' && session.sim?.tick === 0 && session.phaseClock < 2.3) || closeUp() ? 'greet' : 'run',
          x: getX(),
          shake: session.phase === 'crashed' ? Math.max(0, 1 - session.phaseClock / 0.4) : 0,
        })}
      />
      <AdaptiveQuality level={quality} setLevel={(l) => set({ quality: l })} onSample={(fps) => set({ fps: Math.round(fps) })} />
    </>
  )
}

export function GameCanvas() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={1}
      gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
      camera={{ fov: 58, near: 0.1, far: 170, position: [-1.2, 1.35, 3.6] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.08
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          useUi.getState().set({ webglError: 'O vídeo do jogo foi reiniciado pelo navegador. Aguarde um instante…' })
        })
        canvas.addEventListener('webglcontextrestored', () => useUi.getState().set({ webglError: null }))
      }}
      style={{ position: 'fixed', inset: 0, touchAction: 'none' }}
    >
      <Scene />
    </Canvas>
  )
}

