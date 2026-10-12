import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/**
 * Junta muitas peças simples numa única geometria com cor por vértice.
 * Um segmento inteiro de corredor vira poucas chamadas de desenho.
 */
export class GeoBuilder {
  private parts: THREE.BufferGeometry[] = []
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler()
  private v = new THREE.Vector3()
  private s = new THREE.Vector3()

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone()
    g.deleteAttribute('uv')
    if (g.getAttribute('uv1')) g.deleteAttribute('uv1')
    this.e.set(rot[0], rot[1], rot[2])
    this.q.setFromEuler(this.e)
    this.m.compose(this.v.set(...pos), this.q, this.s.set(...scale))
    g.applyMatrix4(this.m)
    const c = new THREE.Color(color)
    const n = g.getAttribute('position').count
    const colors = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.parts.push(g)
    return this
  }

  /** caixa posicionada pelo centro */
  box(w: number, h: number, d: number, color: THREE.ColorRepresentation, pos: [number, number, number], rot?: [number, number, number]) {
    return this.add(BOX, color, pos, rot, [w, h, d])
  }

  cyl(rTop: number, rBottom: number, h: number, color: THREE.ColorRepresentation, pos: [number, number, number], rot?: [number, number, number], segments = 16) {
    return this.add(new THREE.CylinderGeometry(rTop, rBottom, h, segments), color, pos, rot)
  }

  sphere(r: number, color: THREE.ColorRepresentation, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
    return this.add(SPHERE, color, pos, [0, 0, 0], [r * scale[0], r * scale[1], r * scale[2]])
  }

  get empty() {
    return this.parts.length === 0
  }

  build(): THREE.BufferGeometry {
    if (!this.parts.length) return new THREE.BufferGeometry()
    const merged = mergeGeometries(this.parts, false)!
    merged.computeBoundingSphere()
    for (const p of this.parts) p.dispose()
    this.parts = []
    return merged
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1)
const SPHERE = new THREE.SphereGeometry(1, 16, 12)
