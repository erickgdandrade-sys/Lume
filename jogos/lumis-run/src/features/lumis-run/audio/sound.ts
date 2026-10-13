import { midiToHz, STEPS, TRACKS, type TrackName } from './music'

/**
 * Som do jogo com Web Audio: música e efeitos sintetizados na hora, sem
 * arquivos. Funciona offline e no arquivo único.
 *
 * O navegador só libera o áudio depois de um clique, toque ou tecla
 * (política de autoplay). Até isso acontecer, tudo fica em silêncio e
 * `locked` fica verdadeiro.
 */
export type Sfx = 'jump' | 'slide' | 'lane' | 'book' | 'crash' | 'level' | 'record' | 'tick' | 'click' | 'count' | 'go' | 'fim' | 'save' | 'error'

const PREFS_KEY = 'lumis-run:som'

interface Prefs {
  muted: boolean
  music: boolean
}

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    return { muted: !!p.muted, music: p.music !== false }
  } catch {
    return { muted: false, music: true }
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private noise!: AudioBuffer
  private timer: ReturnType<typeof setInterval> | null = null
  private track: TrackName | null = null
  private step = 0
  private loop = 0
  private nextTime = 0
  private tempo = 1
  private ducked = false
  private bookCombo = 0
  private lastBook = 0
  prefs: Prefs = typeof localStorage !== 'undefined' ? loadPrefs() : { muted: false, music: true }
  private subs = new Set<() => void>()
  /** contadores para testes e diagnóstico */
  stats: Record<string, number> = {}

  get locked() {
    return !this.ctx || this.ctx.state !== 'running'
  }

  get currentTrack() {
    return this.track
  }

  subscribe(cb: () => void) {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }

  private notify() {
    for (const s of [...this.subs]) s()
    ;(globalThis as unknown as { __lumisAudio?: object }).__lumisAudio = { state: this.ctx?.state ?? 'none', track: this.track, ...this.prefs, stats: { ...this.stats } }
  }

  /** chamado em qualquer clique, toque, tecla ou botão do controle */
  unlock() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      const ctx = new AC({ latencyHint: 'interactive' })
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = this.prefs.muted ? 0 : 0.85
      const comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -14
      comp.ratio.value = 4
      this.master.connect(comp).connect(ctx.destination)
      this.musicBus = ctx.createGain()
      this.musicBus.gain.value = this.musicLevel()
      this.musicBus.connect(this.master)
      this.sfxBus = ctx.createGain()
      this.sfxBus.gain.value = 0.7
      this.sfxBus.connect(this.master)
      const len = ctx.sampleRate
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      let seed = 1234567
      for (let i = 0; i < len; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        d[i] = (seed / 0x3fffffff - 1) * 0.9
      }
      ctx.onstatechange = () => this.notify()
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.nextTime = 0
      })
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().then(() => this.notify(), () => {})
    if (this.track && !this.timer) this.startScheduler()
    this.notify()
  }

  private musicLevel() {
    return !this.prefs.music ? 0 : this.ducked ? 0.1 : 0.32
  }

  private savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs))
    } catch {
      // sem armazenamento
    }
  }

  setMuted(m: boolean) {
    this.prefs.muted = m
    this.savePrefs()
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.03)
    this.notify()
  }

  setMusic(on: boolean) {
    this.prefs.music = on
    this.savePrefs()
    this.applyMusicLevel()
    this.notify()
  }

  /** música mais baixa (pausa) */
  duck(on: boolean) {
    this.ducked = on
    this.applyMusicLevel()
  }

  private applyMusicLevel() {
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.musicLevel(), this.ctx.currentTime, 0.08)
  }

  /** troca de trilha; null para a música */
  music(name: TrackName | null) {
    if (name === this.track) return
    this.track = name
    this.step = 0
    this.loop = 0
    this.nextTime = 0
    this.tempo = 1
    if (!name) this.stopScheduler()
    else if (this.ctx) this.startScheduler()
    this.notify()
  }

  /** acelera a música conforme o nível (1 a 5) */
  setLevel(level: number) {
    this.tempo = 1 + Math.min(level - 1, 8) * 0.025
  }

  private startScheduler() {
    if (this.timer) return
    this.timer = setInterval(() => this.schedule(), 25)
  }

  private stopScheduler() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private schedule() {
    const ctx = this.ctx
    if (!ctx || !this.track || ctx.state !== 'running') return
    const tr = TRACKS[this.track]
    const stepDur = 60 / (tr.bpm * this.tempo) / 4
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(tr, this.step, this.nextTime, stepDur)
      this.nextTime += stepDur
      this.step++
      if (this.step >= STEPS) {
        this.step = 0
        this.loop++
      }
    }
  }

  private playStep(tr: (typeof TRACKS)[TrackName], i: number, t: number, sd: number) {
    const bar = Math.floor(i / 16)
    const run = this.track === 'run'
    // acorde no início de cada compasso (e no meio, na corrida)
    if (i % 16 === 0 || (run && i % 16 === 8)) for (const n of tr.chords[bar]) this.tone(midiToHz(n), t, sd * (run ? 6 : 14), 'triangle', run ? 0.05 : 0.07, this.musicBus, 0.01, 2400)
    const b = tr.bass[i]
    if (b != null) this.tone(midiToHz(b), t, sd * (run ? 1.6 : 7), run ? 'square' : 'triangle', run ? 0.075 : 0.12, this.musicBus, 0.005, run ? 700 : 900)
    const lead = tr.lead[this.loop % tr.lead.length][i]
    if (lead != null) this.tone(midiToHz(lead), t, sd * (run ? 1.7 : 3.5), tr.leadWave, run ? 0.045 : 0.08, this.musicBus, 0.005, run ? 3200 : 4000)
    const d = tr.drums[i % tr.drums.length]
    if (d === 'k') this.kick(t, this.musicBus, 0.55)
    else if (d === 's') this.snare(t, this.musicBus, 0.22)
    else if (d === 'h') this.hat(t, this.musicBus, run ? 0.07 : 0.04, 0.03)
    else if (d === 'o') this.hat(t, this.musicBus, 0.08, 0.14)
  }

  // ---------- instrumentos ----------
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, out: AudioNode, attack = 0.005, cutoff = 0, slideTo = 0) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    let node: AudioNode = o
    if (cutoff) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = cutoff
      node.connect(f)
      node = f
    }
    node.connect(g).connect(out)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private noiseHit(t: number, dur: number, vol: number, out: AudioNode, filter: BiquadFilterType, freq: number, freqTo = 0, q = 0.8) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.setValueAtTime(freq, t)
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur)
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(out)
    src.start(t, Math.random() * 0.5)
    src.stop(t + dur + 0.02)
  }

  private kick(t: number, out: AudioNode, vol: number) {
    this.tone(150, t, 0.16, 'sine', vol, out, 0.002, 0, 42)
  }

  private snare(t: number, out: AudioNode, vol: number) {
    this.noiseHit(t, 0.13, vol, out, 'bandpass', 1900, 0, 0.7)
    this.tone(190, t, 0.07, 'triangle', vol * 0.5, out)
  }

  private hat(t: number, out: AudioNode, vol: number, dur: number) {
    this.noiseHit(t, dur, vol, out, 'highpass', 7500)
  }

  // ---------- efeitos ----------
  play(name: Sfx) {
    this.stats[name] = (this.stats[name] ?? 0) + 1
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running' || this.prefs.muted) {
      this.notify()
      return
    }
    const t = ctx.currentTime + 0.005
    const out = this.sfxBus
    const N = (n: number) => midiToHz(n)
    switch (name) {
      case 'jump':
        this.tone(330, t, 0.2, 'square', 0.08, out, 0.005, 2600, 880)
        this.tone(660, t, 0.16, 'sine', 0.08, out, 0.005, 0, 1320)
        break
      case 'slide':
        this.noiseHit(t, 0.32, 0.22, out, 'bandpass', 2400, 400, 1.2)
        this.tone(300, t, 0.2, 'triangle', 0.06, out, 0.005, 0, 150)
        break
      case 'lane':
        this.noiseHit(t, 0.12, 0.12, out, 'bandpass', 900, 2800, 1.5)
        break
      case 'book': {
        // notas sobem a cada livro seguido (sequência de até uma oitava)
        const now = performance.now()
        this.bookCombo = now - this.lastBook < 1400 ? Math.min(this.bookCombo + 1, 7) : 0
        this.lastBook = now
        const scale = [0, 2, 4, 5, 7, 9, 11, 12]
        const base = 84 + scale[this.bookCombo]
        this.tone(N(base), t, 0.14, 'triangle', 0.13, out)
        this.tone(N(base + 7), t + 0.06, 0.22, 'sine', 0.1, out)
        this.tone(N(base + 19), t + 0.06, 0.18, 'sine', 0.03, out)
        break
      }
      case 'crash':
        this.noiseHit(t, 0.5, 0.45, out, 'lowpass', 2200, 200)
        this.tone(120, t, 0.35, 'sine', 0.5, out, 0.002, 0, 40)
        this.tone(N(72), t + 0.08, 0.16, 'square', 0.06, out, 0.005, 2000)
        this.tone(N(67), t + 0.22, 0.16, 'square', 0.06, out, 0.005, 2000)
        this.tone(N(60), t + 0.36, 0.3, 'square', 0.06, out, 0.005, 2000)
        break
      case 'level':
        ;[72, 76, 79, 84].forEach((n, i) => this.tone(N(n), t + i * 0.07, 0.22, 'square', 0.06, out, 0.005, 3500))
        this.tone(N(88), t + 0.28, 0.4, 'triangle', 0.1, out)
        break
      case 'record':
        ;[79, 84, 88, 91, 96].forEach((n, i) => this.tone(N(n), t + i * 0.055, 0.3, 'sine', 0.09, out))
        this.noiseHit(t, 0.4, 0.05, out, 'highpass', 9000)
        break
      case 'tick':
        this.tone(1300, t, 0.035, 'sine', 0.05, out)
        break
      case 'click':
        this.tone(N(84), t, 0.06, 'triangle', 0.09, out)
        this.tone(N(91), t + 0.04, 0.08, 'triangle', 0.06, out)
        break
      case 'count':
        this.tone(N(72), t, 0.16, 'square', 0.07, out, 0.005, 3000)
        break
      case 'go':
        this.tone(N(84), t, 0.32, 'square', 0.08, out, 0.005, 4000)
        this.tone(N(91), t, 0.32, 'triangle', 0.06, out)
        break
      case 'fim':
        ;[79, 76, 72, 74, 72].forEach((n, i) => this.tone(N(n), t + i * 0.12, 0.2, 'triangle', 0.1, out))
        break
      case 'save':
        ;[72, 76, 79, 84, 79, 84].forEach((n, i) => this.tone(N(n), t + i * 0.09, 0.2, i < 4 ? 'square' : 'triangle', 0.06, out, 0.005, 3500))
        break
      case 'error':
        this.tone(220, t, 0.12, 'square', 0.06, out, 0.005, 1200)
        this.tone(180, t + 0.1, 0.16, 'square', 0.06, out, 0.005, 1200)
        break
    }
    this.notify()
  }
}

export const sound = new SoundEngine()

/** libera o áudio no primeiro gesto do usuário */
export function installAudioUnlock() {
  const un = () => sound.unlock()
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, un, { capture: true, passive: true })
}
