/**
 * Fotos dos jogadores, guardadas no IndexedDB do navegador do stand
 * (cabe muito mais que no localStorage). Cada foto é um JPEG pequeno
 * (256×256, ~15 KB) identificado pelo id público do jogador.
 * Foto é dado pessoal: só é tirada com autorização e some com
 * "Apagar ranking e contatos".
 */
const DB = 'lumis-run'
const STORE = 'fotos'

type Listener = () => void

class PhotoStore {
  private cache = new Map<string, string>() // id -> data URL
  private db: Promise<IDBDatabase | null> | null = null
  private subs = new Set<Listener>()
  private version = 0

  private open() {
    if (!this.db) {
      this.db = new Promise((res) => {
        try {
          const req = indexedDB.open(DB, 1)
          req.onupgradeneeded = () => req.result.createObjectStore(STORE)
          req.onsuccess = () => res(req.result)
          req.onerror = () => res(null)
        } catch {
          res(null)
        }
      })
      void this.db.then((db) => this.loadAll(db))
    }
    return this.db
  }

  private loadAll(db: IDBDatabase | null) {
    if (!db) return
    const tx = db.transaction(STORE, 'readonly')
    const st = tx.objectStore(STORE)
    const req = st.openCursor()
    req.onsuccess = () => {
      const c = req.result
      if (!c) return this.notify()
      if (typeof c.value === 'string') this.cache.set(String(c.key), c.value)
      c.continue()
    }
  }

  private notify() {
    this.version++
    for (const s of [...this.subs]) s()
  }

  /** começa a carregar as fotos salvas */
  init() {
    void this.open()
  }

  get(id: string) {
    return this.cache.get(id) ?? null
  }

  get stamp() {
    return this.version
  }

  async set(id: string, dataUrl: string) {
    this.cache.set(id, dataUrl)
    this.notify()
    const db = await this.open()
    if (!db) return
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(dataUrl, id)
      tx.oncomplete = tx.onerror = () => res()
    })
  }

  async clear() {
    this.cache.clear()
    this.notify()
    const db = await this.open()
    if (!db) return
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).clear()
      tx.oncomplete = tx.onerror = () => res()
    })
  }

  subscribe(cb: Listener) {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }
}

export const photos = new PhotoStore()

/** recorta o centro do vídeo em quadrado, espelha (como um espelho) e gera JPEG */
export function captureSquare(video: HTMLVideoElement, size = 256, quality = 0.78) {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null
  const s = Math.min(w, h)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.translate(size, 0)
  g.scale(-1, 1)
  g.drawImage(video, (w - s) / 2, (h - s) / 2, s, s, 0, 0, size, size)
  return c.toDataURL('image/jpeg', quality)
}
