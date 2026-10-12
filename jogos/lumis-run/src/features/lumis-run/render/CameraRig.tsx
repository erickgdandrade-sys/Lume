import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA } from '../config/gameConfig'

export interface CameraTarget {
  mode: 'menu' | 'greet' | 'run'
  x: number
  shake: number // 0..1
}

const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt))

/**
 * Câmera em terceira pessoa, atrás e acima da Lumis, olhando à frente para o
 * jogador antecipar os obstáculos. No menu, fica de frente para a Lumis.
 * O campo de visão abre em telas em pé (tablets) para manter as três faixas visíveis.
 */
export function CameraRig({ read }: { read: () => CameraTarget }) {
  const { camera, size } = useThree()
  const look = useRef(new THREE.Vector3(0, 1, -5))
  const pos = useRef(new THREE.Vector3(-1.2, CAMERA.menu.height, CAMERA.menu.distance))
  const tmpPos = new THREE.Vector3()
  const tmpLook = new THREE.Vector3()

  useFrame((state, dt) => {
    const t = read()
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const fov = aspect >= 1.2 ? CAMERA.fovLandscape : aspect <= 0.8 ? CAMERA.fovPortrait : THREE.MathUtils.lerp(CAMERA.fovPortrait, CAMERA.fovLandscape, (aspect - 0.8) / 0.4)
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }

    if (t.mode === 'run') {
      const r = CAMERA.run
      tmpPos.set(t.x * r.followX, r.height, r.distance)
      tmpLook.set(t.x * 0.7, r.lookHeight, -r.lookAhead)
    } else if (t.mode === 'greet') {
      // contagem: câmera perto da Lumis para ver o tchau; volta para trás na largada
      tmpPos.set(t.x + 0.35, 1.45, 3.1)
      tmpLook.set(t.x, 1.3, 0)
    } else {
      const m = CAMERA.menu
      const sway = Math.sin(state.clock.elapsedTime * 0.25) * 0.35
      tmpPos.set(-1.15 + sway, m.height, m.distance)
      tmpLook.set(-0.4, m.lookHeight, 0)
    }
    const k = t.mode === 'run' ? CAMERA.smoothing : t.mode === 'greet' ? 3 : 2.2
    pos.current.set(damp(pos.current.x, tmpPos.x, k, dt), damp(pos.current.y, tmpPos.y, k, dt), damp(pos.current.z, tmpPos.z, k, dt))
    look.current.set(damp(look.current.x, tmpLook.x, k, dt), damp(look.current.y, tmpLook.y, k, dt), damp(look.current.z, tmpLook.z, k, dt))

    cam.position.copy(pos.current)
    if (t.shake > 0) {
      const s = t.shake * 0.12
      const time = state.clock.elapsedTime
      cam.position.x += Math.sin(time * 61) * s
      cam.position.y += Math.sin(time * 47 + 1) * s
    }
    cam.lookAt(look.current)
  })
  return null
}
