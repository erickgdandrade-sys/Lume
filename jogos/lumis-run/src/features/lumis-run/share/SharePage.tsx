import { useEffect, useRef, useState } from 'react'
import LOGO from '../../../assets/lume-logo.png'
import { drawStory, storyBlob } from './storyArt'
import { decodeStory } from './storyData'

/** Abre a câmera dos stories do Instagram (só o app; a imagem não vai junto). */
export const INSTAGRAM_STORY_CAMERA = 'instagram://story-camera'

export type Platform = 'android' | 'ios' | 'outro'

export function detectPlatform(ua: string): Platform {
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua))) return 'ios'
  return 'outro'
}

/** Navegadores embutidos (Instagram, Facebook, TikTok…) não compartilham arquivos. */
export function isInAppBrowser(ua: string): boolean {
  return /instagram|fban|fbav|fb_iab|tiktok|bytedance|line\//i.test(ua)
}

/**
 * Página aberta pelo QR code no celular do visitante (#arte=...).
 * Não carrega o jogo 3D: desenha a arte assim que abre e deixa um único botão,
 * "Postar no Instagram", que entrega a imagem pronta ao Instagram pelo menu de
 * compartilhar do celular (Web Share com arquivo). O Instagram não aceita receber
 * uma imagem direto por link, então esse toque é o mínimo possível pela web.
 */
export function SharePage({ code }: { code: string }) {
  const data = decodeStory(code)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<{ url: string; file: File } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const platform = detectPlatform(ua)
  const inApp = isInAppBrowser(ua)

  useEffect(() => {
    document.documentElement.classList.add('lr-page')
    if (!data || !canvas.current) return
    let url = ''
    void drawStory(canvas.current, data)
      .then(storyBlob)
      .then((b) => {
        url = URL.createObjectURL(b)
        setImg({ url, file: new File([b], 'lumis-run-stories.png', { type: 'image/png' }) })
      })
      .catch(() => setMsg('Não foi possível gerar a imagem neste navegador.'))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [code])

  const canShareFile = !!img && typeof navigator.canShare === 'function' && navigator.canShare({ files: [img.file] })

  // A imagem já está pronta antes do toque, então o menu abre na hora
  // (o navegador só permite abrir o compartilhamento durante um toque).
  const share = async () => {
    if (!img) return
    setMsg(null)
    try {
      await navigator.share({ files: [img.file] })
      setDone(true)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg('O compartilhamento não abriu. Salve a imagem e poste pelo Instagram.')
    }
  }

  if (!data) {
    return (
      <main className="lr-share-page">
        <img src={LOGO} alt="Lume" className="lr-share-logo" />
        <h1>Link inválido</h1>
        <p>Esse endereço não tem uma arte do Lumis Run. Escaneie o QR code de novo na tela do jogo.</p>
      </main>
    )
  }

  const pick = platform === 'ios' ? <>escolha <strong>Instagram</strong> e depois <strong>Story</strong></> : <>escolha <strong>Stories</strong> (o ícone do Instagram)</>

  return (
    <main className="lr-share-page">
      <img src={LOGO} alt="Lume" className="lr-share-logo" />
      <h1>{done ? 'Agora é só postar!' : 'Sua arte está pronta'}</h1>
      <p className="lr-share-lead">{done ? 'Toque em "Seu story" no Instagram e marque a Lume.' : 'Poste nos stories e marque a Lume!'}</p>
      <canvas ref={canvas} hidden />

      {inApp && (
        <p className="lr-share-warn">
          Abra esta página no navegador do celular ({platform === 'ios' ? 'Safari' : 'Chrome'}) para postar direto: toque em ⋯ e em <strong>Abrir no navegador</strong>.
        </p>
      )}

      {!inApp && canShareFile && (
        <div className="lr-share-actions">
          <button className="lr-cta lr-insta" onClick={share}>
            <InstagramIcon /> Postar no Instagram
          </button>
        </div>
      )}

      <div className="lr-share-art">{img ? <img src={img.url} alt={`Arte com ${data.score} pontos e ${data.books} livros`} /> : <span>Gerando a arte…</span>}</div>

      {!inApp && canShareFile ? (
        <ol className="lr-share-steps">
          <li>Toque em <strong>Postar no Instagram</strong>.</li>
          <li>No menu do celular, {pick}.</li>
          <li>A arte abre pronta no Instagram. É só tocar em <strong>Seu story</strong>.</li>
        </ol>
      ) : (
        <>
          <div className="lr-share-actions">
            {img && (
              <a className="lr-cta" href={img.url} download="lumis-run-stories.png">
                1. Salvar imagem
              </a>
            )}
            <a className="lr-btn lr-insta-outline" href={INSTAGRAM_STORY_CAMERA}>
              <InstagramIcon /> 2. Abrir os stories
            </a>
          </div>
          <ol className="lr-share-steps">
            <li>Salve a imagem (ou segure o dedo nela e escolha salvar).</li>
            <li>Abra os stories e escolha a imagem na galeria: ela é a mais recente.</li>
          </ol>
        </>
      )}

      {!inApp && canShareFile && img && (
        <a className="lr-link" href={img.url} download="lumis-run-stories.png">
          Prefiro só salvar a imagem
        </a>
      )}
      {msg && <p className="lr-error">{msg}</p>}
    </main>
  )
}

function InstagramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
