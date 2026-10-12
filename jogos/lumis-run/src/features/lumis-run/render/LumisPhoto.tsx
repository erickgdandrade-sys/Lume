import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { LUMIS } from '../config/gameConfig'
import { Lumis } from './Lumis'
import { computePose, type Expression } from './lumisPose'

/**
 * Modo de "foto" usado só na produção de assets (?lumis-foto=alegria):
 * a Lumis sozinha em fundo transparente, para a arte dos stories.
 */
export function LumisPhoto({ expression, wave = 0 }: { expression: Expression; wave?: number }) {
  const driver = {
    read: () => {
      const pose = computePose('menu', 0, 0)
      pose.ry = -0.32
      pose.rz = 0.1
      pose.rx = -0.05
      pose.y = LUMIS.hoverHeight
      pose.blink = 0
      pose.wave = wave
      return { pose, x: 0, expressionOverride: expression }
    },
  }
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NeutralToneMapping }}
      camera={{ fov: 30, position: [0, LUMIS.hoverHeight, 3.2] }}
      onCreated={({ camera, gl }) => {
        gl.setClearColor(0x000000, 0)
        camera.lookAt(0, LUMIS.hoverHeight, 0)
      }}
      style={{ position: 'fixed', inset: 0, background: 'transparent' }}
    >
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#FFFFFF', '#F1E6D6', 1.4]} />
      <directionalLight position={[-2, 3, 4]} intensity={1.8} />
      <Lumis driver={driver} shadowless />
    </Canvas>
  )
}
