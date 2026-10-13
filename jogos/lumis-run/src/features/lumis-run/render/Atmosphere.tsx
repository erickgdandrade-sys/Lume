import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scenarioDef } from './scenery'
import type { Atmosphere as Atmo } from './scenery/types'

const SKY_R = 150

/**
 * Céu, neblina e luzes do cenário atual. Ao trocar de cenário, tudo muda
 * suavemente em cerca de um segundo. A luz principal projeta sombra numa
 * área pequena que acompanha a Lumis.
 */
export function Atmosphere({ getX, getScene, shadows, hiRes = false }: { getX: () => number; getScene: () => number; shadows: boolean; hiRes?: boolean }) {
  const { scene, camera } = useThree()
  const key = useRef<THREE.DirectionalLight>(null!)
  const fill = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const sky = useRef<THREE.Mesh>(null!)
  const target = useRef(new THREE.Object3D())

  const res = useMemo(() => {
    const a = scenarioDef(0).atmosphere
    const fog = new THREE.Fog(a.horizon, a.fogNear, a.fogFar)
    const uniforms = { uTop: { value: new THREE.Color(a.skyTop) }, uHorizon: { value: new THREE.Color(a.horizon) } }
    const skyMat = new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; varying vec3 vDir;
        void main() { float k = smoothstep(0.0, 0.55, vDir.y); gl_FragColor = vec4(mix(uHorizon, uTop, k), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    })
    const skyGeo = new THREE.SphereGeometry(SKY_R, 32, 16)
    // estado atual (interpolado) do clima
    const cur = {
      top: new THREE.Color(a.skyTop),
      horizon: new THREE.Color(a.horizon),
      hemiSky: new THREE.Color(a.hemiSky),
      hemiGround: new THREE.Color(a.hemiGround),
      sun: new THREE.Color(a.sun),
      fill: new THREE.Color(a.fill),
      n: { hemi: a.hemi, sun: a.sunIntensity, fill: a.fillIntensity, near: a.fogNear, far: a.fogFar, dx: a.sunDir[0], dy: a.sunDir[1], dz: a.sunDir[2] },
    }
    return { fog, uniforms, skyMat, skyGeo, cur, tmp: new THREE.Color() }
  }, [])

  useEffect(() => {
    scene.fog = res.fog
    scene.background = null
    return () => {
      scene.fog = null
      res.skyMat.dispose()
      res.skyGeo.dispose()
    }
  }, [scene, res])

  useEffect(() => {
    const cam = key.current.shadow.camera
    key.current.target = target.current
    cam.left = -7
    cam.right = 7
    cam.top = 14
    cam.bottom = -12
    cam.near = 1
    cam.far = 30
    cam.updateProjectionMatrix()
    key.current.shadow.bias = -0.0008
    key.current.shadow.normalBias = 0.02
    key.current.shadow.radius = 5
  }, [])

  useEffect(() => {
    const l = key.current
    const size = hiRes ? 2048 : 1024
    if (l.shadow.mapSize.x === size) return
    l.shadow.mapSize.set(size, size)
    l.shadow.map?.dispose()
    l.shadow.map = null
  }, [hiRes])

  useFrame((_, dt) => {
    const a: Atmo = scenarioDef(getScene()).atmosphere
    const c = res.cur
    const k = 1 - Math.exp(-2.4 * Math.min(dt, 0.1))
    const col = (v: THREE.Color, hex: string) => v.lerp(res.tmp.set(hex), k)
    col(c.top, a.skyTop)
    col(c.horizon, a.horizon)
    col(c.hemiSky, a.hemiSky)
    col(c.hemiGround, a.hemiGround)
    col(c.sun, a.sun)
    col(c.fill, a.fill)
    const n = c.n
    n.hemi += (a.hemi - n.hemi) * k
    n.sun += (a.sunIntensity - n.sun) * k
    n.fill += (a.fillIntensity - n.fill) * k
    n.near += (a.fogNear - n.near) * k
    n.far += (a.fogFar - n.far) * k
    n.dx += (a.sunDir[0] - n.dx) * k
    n.dy += (a.sunDir[1] - n.dy) * k
    n.dz += (a.sunDir[2] - n.dz) * k

    res.uniforms.uTop.value.copy(c.top)
    res.uniforms.uHorizon.value.copy(c.horizon)
    res.fog.color.copy(c.horizon)
    res.fog.near = n.near
    res.fog.far = n.far
    hemi.current.color.copy(c.hemiSky)
    hemi.current.groundColor.copy(c.hemiGround)
    hemi.current.intensity = n.hemi
    key.current.color.copy(c.sun)
    key.current.intensity = n.sun
    fill.current.color.copy(c.fill)
    fill.current.intensity = n.fill
    sky.current.position.copy(camera.position)

    const x = getX() * 0.5
    key.current.position.set(x + n.dx, n.dy, n.dz)
    target.current.position.set(x, 0, -8)
    target.current.updateMatrixWorld()
  })

  return (
    <>
      <mesh ref={sky} geometry={res.skyGeo} material={res.skyMat} renderOrder={-10} frustumCulled={false} />
      <hemisphereLight ref={hemi} />
      <directionalLight ref={key} castShadow={shadows} />
      {/* luz de preenchimento vinda da câmera: modela o volume da Lumis e dos obstáculos */}
      <directionalLight ref={fill} position={[2, 3, 8]} />
      <primitive object={target.current} />
    </>
  )
}
