import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Iluminação enxuta: uma luz hemisférica para o ambiente e uma direcional
 * com sombra numa área pequena que acompanha a Lumis.
 */
export function Lights({ getX, shadows, hiRes = false }: { getX: () => number; shadows: boolean; hiRes?: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null!)
  const target = useRef(new THREE.Object3D())

  useEffect(() => {
    const l = key.current
    l.target = target.current
    const cam = l.shadow.camera
    cam.left = -7
    cam.right = 7
    // área de sombra mais longa à frente, para os obstáculos já chegarem com sombra
    cam.top = 14
    cam.bottom = -12
    cam.near = 1
    cam.far = 30
    cam.updateProjectionMatrix()
    l.shadow.bias = -0.0008
    l.shadow.normalBias = 0.02
    l.shadow.radius = 4
  }, [])

  useEffect(() => {
    const l = key.current
    const size = hiRes ? 2048 : 1024
    if (l.shadow.mapSize.x === size) return
    l.shadow.mapSize.set(size, size)
    l.shadow.map?.dispose()
    l.shadow.map = null
  }, [hiRes])

  useFrame(() => {
    const x = getX() * 0.5
    key.current.position.set(x - 3.5, 9, 2)
    target.current.position.set(x, 0, -8)
    target.current.updateMatrixWorld()
  })

  return (
    <>
      <ambientLight intensity={0.85} color="#FFF8EE" />
      <hemisphereLight args={['#FFFFFF', '#E9DCCB', 1.45]} />
      <directionalLight ref={key} intensity={1.9} color="#FFF4E0" castShadow={shadows} />
      {/* luz de preenchimento vinda da câmera: modela o volume da Lumis e dos obstáculos */}
      <directionalLight position={[2, 3, 8]} intensity={0.45} color="#E8F0FF" />
      <primitive object={target.current} />
    </>
  )
}
