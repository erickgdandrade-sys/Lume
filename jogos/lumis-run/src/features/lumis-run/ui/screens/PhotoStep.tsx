import { ranking } from '../../ranking/store'
import { useEffect, useRef, useState } from 'react'
import { sound } from '../../audio/sound'
import { input } from '../../input/inputManager'
import { captureSquare } from '../../ranking/photos'
import { Hint } from '../bits'
import { useMenuNav } from '../useInput'

type Step = 'pedir' | 'camera' | 'revisar' | 'erro'

/**
 * Foto para o ranking, depois do nome e do WhatsApp. É opcional: a pessoa
 * autoriza antes de a câmera abrir e pode seguir sem foto a qualquer momento.
 */
export function PhotoStep({ name, onDone, onBack }: { name: string; onDone: (photo: string | null) => void; onBack: () => void }) {
  const [step, setStep] = useState<Step>('pedir')
  const [shot, setShot] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [flash, setFlash] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const done = useRef(false)

  // nesta etapa o teclado navega pelos botões (setas, Enter, Esc)
  useEffect(() => {
    input.setContext('menu')
    input.latch()
    return () => {
      input.setContext('text')
      input.latch()
    }
  }, [])

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }
  useEffect(() => stop, [])

  const finish = (photo: string | null) => {
    if (done.current) return
    done.current = true
    stop()
    onDone(photo)
  }

  const openCamera = async () => {
    setShot(null)
    setStep('camera')
    if (stream.current) return
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('sem câmera')
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } }, audio: false })
      stream.current = s
      if (video.current) {
        video.current.srcObject = s
        await video.current.play().catch(() => {})
      }
    } catch (e) {
      const n = (e as Error).name
      setErrMsg(n === 'NotAllowedError' ? 'O navegador não deu permissão para usar a câmera.' : 'Não encontramos uma câmera neste computador.')
      setStep('erro')
    }
  }

  // contagem 3, 2, 1 e foto
  const startCount = () => {
    if (count > 0) return
    setCount(3)
    sound.play('count')
  }
  useEffect(() => {
    if (count <= 0) return
    const id = setTimeout(() => {
      if (count > 1) {
        setCount(count - 1)
        sound.play('count')
        return
      }
      setCount(0)
      const img = video.current && captureSquare(video.current)
      if (!img) {
        setErrMsg('A câmera não mandou imagem. Tente de novo.')
        setStep('erro')
        return
      }
      sound.play('go')
      setFlash(true)
      setTimeout(() => setFlash(false), 250)
      setShot(img)
      setStep('revisar')
    }, 800)
    return () => clearTimeout(id)
  }, [count])

  useMenuNav(ref, { onBack: step === 'pedir' ? onBack : () => finish(null) })
  // a navegação foca o primeiro botão de cada etapa
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-nav]')?.focus({ preventScroll: true })
  }, [step])

  return (
    <div className="lr-card lr-photo-card" ref={ref}>
      <p className="lr-eyebrow">Foto para o ranking</p>
      {step === 'pedir' && (
        <>
          <h2 className="lr-h2">{name}, quer aparecer com foto?</h2>
          <p className="lr-note-text">
            {ranking.online ? 'A foto aparece ao lado do seu nome no ranking do jogo, que qualquer pessoa pode ver no site da Lume, e ajuda a equipe a encontrar você para entregar o prêmio. Ela é apagada depois do evento. É opcional.' : 'A foto aparece ao lado do seu nome no ranking, na tela do stand, e ajuda a equipe da Lume a encontrar você para entregar o prêmio. Ela fica só neste computador e é apagada depois do evento. É opcional.'}
          </p>
          <div className="lr-actions">
            <button className="lr-cta" data-nav onClick={openCamera}>
              <Hint pad="A" kb="Enter" /> Tirar foto
            </button>
            <button className="lr-btn" data-nav onClick={() => finish(null)}>
              Sem foto
            </button>
          </div>
        </>
      )}
      {(step === 'camera' || step === 'revisar') && (
        <>
          <div className="lr-camera">
            <video ref={video} playsInline muted autoPlay hidden={step !== 'camera'} />
            {step === 'revisar' && shot && <img src={shot} alt="Sua foto" />}
            {count > 0 && <span className="lr-camera-count">{count}</span>}
            {flash && <span className="lr-camera-flash" />}
          </div>
          {step === 'camera' ? (
            <div className="lr-actions">
              <button className="lr-cta" data-nav onClick={startCount} disabled={count > 0}>
                <Hint pad="A" kb="Enter" /> {count > 0 ? 'Sorria!' : 'Tirar foto'}
              </button>
              <button className="lr-btn" data-nav onClick={() => finish(null)}>
                <Hint pad="B" kb="Esc" /> Sem foto
              </button>
            </div>
          ) : (
            <div className="lr-actions">
              <button className="lr-cta" data-nav onClick={() => finish(shot)}>
                <Hint pad="A" kb="Enter" /> Usar esta foto
              </button>
              <button className="lr-btn" data-nav onClick={openCamera}>
                Tirar outra
              </button>
              <button className="lr-btn" data-nav onClick={() => finish(null)}>
                Sem foto
              </button>
            </div>
          )}
        </>
      )}
      {step === 'erro' && (
        <>
          <h2 className="lr-h2">Sem câmera agora</h2>
          <p className="lr-warn">{errMsg}</p>
          <div className="lr-actions">
            <button className="lr-cta" data-nav onClick={() => finish(null)}>
              <Hint pad="A" kb="Enter" /> Continuar sem foto
            </button>
            <button className="lr-btn" data-nav onClick={openCamera}>
              Tentar de novo
            </button>
          </div>
        </>
      )}
    </div>
  )
}
