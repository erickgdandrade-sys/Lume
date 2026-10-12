import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LUMIS } from '../config/gameConfig'
import { LUMIS_COLORS } from '../config/palette'
import { createStarGeometry, radialTexture, surfaceZ } from './lumisGeometry'
import type { Expression, Pose } from './lumisPose'

export interface LumisDriver {
  /** devolve a pose atual e a posição lateral; chamado uma vez por quadro */
  read(): { pose: Pose; x: number; expressionOverride?: Expression | null }
}

// "bracinho" do tchau: a ponta da estrela a 18° (à direita de quem olha para ela)
const ARM_ANGLE = (18 * Math.PI) / 180
const R = LUMIS.radius
const ARM_GLSL = `
uniform float uWave;
const vec2 ARM_DIR = vec2(${Math.cos(ARM_ANGLE).toFixed(5)}, ${Math.sin(ARM_ANGLE).toFixed(5)});
const float ARM_PIVOT = ${(R * 0.4).toFixed(4)};
float lumisArmW(vec3 p) { return smoothstep(${(R * 0.36).toFixed(4)}, ${(R * 0.86).toFixed(4)}, dot(p.xy, ARM_DIR)); }
`

const EYE_X = 0.115
const EYE_Y = 0.04
const MOUTH_Y = -0.075
const CHEEK_X = 0.215
const CHEEK_Y = -0.045

/** posição e inclinação de um elemento assentado na superfície frontal */
function onFace(x: number, y: number, lift = 0.004) {
  const h = 0.01
  const z = surfaceZ(x, y)
  const dzdx = (surfaceZ(x + h, y) - surfaceZ(x - h, y)) / (2 * h)
  const dzdy = (surfaceZ(x, y + h) - surfaceZ(x, y - h)) / (2 * h)
  return {
    position: [x, y, z + lift] as [number, number, number],
    rotation: [Math.atan(dzdy), -Math.atan(dzdx), 0] as [number, number, number],
  }
}

function mouthShapes() {
  // boca aberta em "D": topo reto levemente curvo e base arredondada
  const open = new THREE.Shape()
  const w = 0.066
  const h = 0.06
  open.moveTo(-w, 0)
  open.quadraticCurveTo(0, -0.008, w, 0)
  open.bezierCurveTo(w, -h * 0.9, w * 0.45, -h * 1.15, 0, -h * 1.15)
  open.bezierCurveTo(-w * 0.45, -h * 1.15, -w, -h * 0.9, -w, 0)
  const tongue = new THREE.Shape()
  tongue.absellipse(0, -h * 0.82, w * 0.55, h * 0.33, 0, Math.PI * 2, false, 0)
  return { open: new THREE.ShapeGeometry(open, 16), tongue: new THREE.ShapeGeometry(tongue, 16) }
}

/**
 * Lumis em 3D conforme o modelo oficial: estrela fofa amarela fosca, olhos
 * pretos com brilho, bochechas rosadas e boca aberta com língua.
 * Toda a animação é aplicada direto nos objetos (sem re-render do React).
 */
export function Lumis({ driver, shadowless = false }: { driver: LumisDriver; shadowless?: boolean }) {
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const eyesOpen = useRef<THREE.Group[]>([])
  const eyesHappy = useRef<THREE.Mesh[]>([])
  const mouths = useRef<Record<'aberta' | 'fechada' | 'o', THREE.Object3D | null>>({ aberta: null, fechada: null, o: null })
  const shadow = useRef<THREE.Mesh>(null!)

  const res = useMemo(() => {
    const { geo } = createStarGeometry()
    const bodyMat = new THREE.MeshStandardMaterial({
      color: LUMIS_COLORS.body,
      emissive: LUMIS_COLORS.bodyEmissive,
      emissiveIntensity: 0.16,
      roughness: 0.62,
      metalness: 0,
    })
    const waveUniform = { value: 0 }
    bodyMat.onBeforeCompile = (sh) => {
      sh.uniforms.uWave = waveUniform
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\n${ARM_GLSL}`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          { float a = uWave * lumisArmW(position); float c = cos(a), s = sin(a); objectNormal.xy = mat2(c, s, -s, c) * objectNormal.xy; }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          { float a = uWave * lumisArmW(position); float c = cos(a), s = sin(a); vec2 piv = ARM_DIR * ARM_PIVOT; transformed.xy = piv + mat2(c, s, -s, c) * (transformed.xy - piv); }`)
      // borda iluminada (rim light): dá volume e destaca a Lumis do cenário
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
          { float rim = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0); totalEmissiveRadiance += vec3(1.0, 0.95, 0.78) * pow(rim, 2.6) * 0.32; }`,
      )
    }
    bodyMat.customProgramCacheKey = () => 'lumis-body-v2'
    const eyeMat = new THREE.MeshStandardMaterial({ color: LUMIS_COLORS.eye, roughness: 0.2 })
    const whiteMat = new THREE.MeshBasicMaterial({ color: LUMIS_COLORS.highlight })
    const mouthMat = new THREE.MeshBasicMaterial({ color: LUMIS_COLORS.mouth })
    const tongueMat = new THREE.MeshBasicMaterial({ color: LUMIS_COLORS.tongue })
    const cheekMat = new THREE.MeshBasicMaterial({ color: LUMIS_COLORS.cheek, transparent: true, opacity: 0.6, depthWrite: false })
    const sphere = new THREE.SphereGeometry(1, 20, 14)
    const happyEye = new THREE.TorusGeometry(0.034, 0.011, 8, 18, Math.PI)
    const smile = new THREE.TorusGeometry(0.045, 0.011, 8, 20, Math.PI)
    smile.rotateZ(Math.PI)
    const oMouth = new THREE.CircleGeometry(0.03, 20)
    oMouth.scale(1, 1.25, 1)
    const cheek = new THREE.CircleGeometry(0.045, 24)
    cheek.scale(1.25, 0.8, 1)
    const { open, tongue } = mouthShapes()
    const shadowTex = radialTexture('rgba(15,23,42,0.42)', 'rgba(15,23,42,0)')
    return { waveUniform, geo, bodyMat, eyeMat, whiteMat, mouthMat, tongueMat, cheekMat, sphere, happyEye, smile, oMouth, cheek, open, tongue, shadowTex }
  }, [])

  const face = useMemo(
    () => ({
      eyes: [-1, 1].map((s) => onFace(s * EYE_X, EYE_Y, 0.006)),
      mouth: onFace(0, MOUTH_Y, 0.004),
      cheeks: [-1, 1].map((s) => onFace(s * CHEEK_X, CHEEK_Y, 0.014)),
    }),
    [],
  )

  useFrame(() => {
    const { pose, x, expressionOverride } = driver.read()
    root.current.position.set(x, 0, pose.z)
    body.current.position.y = pose.y
    body.current.rotation.set(pose.rx, pose.ry, pose.rz, 'YXZ')
    body.current.scale.set(pose.sx, pose.sy, pose.sz)
    res.waveUniform.value = pose.wave

    const expr = expressionOverride ?? pose.expression
    const happy = expr === 'feliz'
    const eyeScaleY = expr === 'surpresa' ? 1.3 : expr === 'concentracao' ? 0.8 : 1
    const eyeScaleX = expr === 'surpresa' ? 1.15 : 1
    const open = 1 - pose.blink * 0.92
    for (const e of eyesOpen.current) {
      if (!e) continue
      e.visible = !happy
      e.scale.set(eyeScaleX, eyeScaleY * open, 1)
    }
    for (const e of eyesHappy.current) if (e) e.visible = happy
    const m = mouths.current
    if (m.aberta) m.aberta.visible = expr === 'alegria' || expr === 'feliz'
    if (m.fechada) m.fechada.visible = expr === 'concentracao'
    if (m.o) m.o.visible = expr === 'surpresa'

    // sombra no chão diminui e clareia conforme a Lumis sobe
    const h = Math.max(0, pose.y - 0.4)
    const s = 1.3 / (1 + h * 0.55)
    shadow.current.scale.set(s * pose.sx, s, 1)
    ;(shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.85 / (1 + h * 0.8)
  })

  return (
    <group ref={root}>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position-y={0.012} renderOrder={1} visible={!shadowless}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial map={res.shadowTex} transparent depthWrite={false} />
      </mesh>
      <group ref={body}>
        <mesh geometry={res.geo} material={res.bodyMat} castShadow />
        {face.eyes.map((f, i) => (
          <group key={i} position={f.position} rotation={f.rotation}>
            <group ref={(g) => { if (g) eyesOpen.current[i] = g }}>
              <mesh geometry={res.sphere} material={res.eyeMat} scale={[0.04, 0.056, 0.016]} />
              <mesh geometry={res.sphere} material={res.whiteMat} position={[0.01, 0.018, 0.013]} scale={0.011} />
            </group>
            <mesh ref={(m) => { if (m) eyesHappy.current[i] = m }} geometry={res.happyEye} material={res.eyeMat} position={[0, -0.01, 0]} visible={false} />
          </group>
        ))}
        {face.cheeks.map((f, i) => (
          <mesh key={i} geometry={res.cheek} material={res.cheekMat} position={f.position} rotation={f.rotation} />
        ))}
        <group position={face.mouth.position} rotation={face.mouth.rotation}>
          <group ref={(g) => { mouths.current.aberta = g }}>
            <mesh geometry={res.open} material={res.mouthMat} />
            <mesh geometry={res.tongue} material={res.tongueMat} position-z={0.001} />
          </group>
          <mesh ref={(m) => { mouths.current.fechada = m }} geometry={res.smile} material={res.mouthMat} position-y={0.0} />
          <mesh ref={(m) => { mouths.current.o = m }} geometry={res.oMouth} material={res.mouthMat} position-y={-0.025} />
        </group>
      </group>
    </group>
  )
}
