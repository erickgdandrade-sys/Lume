import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BRAND } from '../config/palette'

const MAX = 64
const LIFE = 0.9

function starSprite() {
  const s = 64
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.translate(s / 2, s / 2)
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, s / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.9)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const r = i % 2 ? s * 0.12 : s * 0.5
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  g.closePath()
  g.fill()
  return new THREE.CanvasTexture(c)
}

/**
 * Partículas de brilho com quantidade fixa (pool). Uma explosão por vez;
 * na Fase 3 a coleta de estrelas usa o mesmo componente.
 */
export function Sparkles({ watch }: { watch: () => { seq: number; x: number; y: number; crash?: boolean } }) {
  const points = useRef<THREE.Points>(null!)
  const state = useRef({ seq: 0, age: LIFE, vel: new Float32Array(MAX * 3) })

  const res = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3))
    const colors = new Float32Array(MAX * 3)
    const palette = [BRAND.amarelo, '#FFFFFF', BRAND.azul, '#FDE68A'].map((c) => new THREE.Color(c))
    for (let i = 0; i < MAX; i++) palette[i % palette.length].toArray(colors, i * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({ size: 0.22, map: starSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    return { geo, mat }
  }, [])

  useFrame((_, dt) => {
    const w = watch()
    const s = state.current
    const pos = res.geo.getAttribute('position') as THREE.BufferAttribute
    if (w.seq !== s.seq) {
      s.seq = w.seq
      s.age = 0
      for (let i = 0; i < MAX; i++) {
        const a = Math.random() * Math.PI * 2
        const up = Math.random()
        const sp = (w.crash ? 3 : 1.4) + Math.random() * (w.crash ? 3 : 1.6)
        s.vel[i * 3] = Math.cos(a) * sp * (1 - up * 0.5)
        s.vel[i * 3 + 1] = (w.crash ? 1.5 : 0.8) + up * (w.crash ? 4 : 2.4)
        s.vel[i * 3 + 2] = Math.sin(a) * sp * (1 - up * 0.5)
        pos.setXYZ(i, w.x, w.y, -0.4)
      }
    }
    if (s.age >= LIFE) {
      points.current.visible = false
      return
    }
    points.current.visible = true
    s.age += dt
    for (let i = 0; i < MAX; i++) {
      s.vel[i * 3 + 1] -= 7 * dt
      pos.setXYZ(i, pos.getX(i) + s.vel[i * 3] * dt, pos.getY(i) + s.vel[i * 3 + 1] * dt, pos.getZ(i) + s.vel[i * 3 + 2] * dt)
    }
    pos.needsUpdate = true
    res.mat.opacity = 1 - s.age / LIFE
  })

  return <points ref={points} geometry={res.geo} material={res.mat} frustumCulled={false} visible={false} />
}
