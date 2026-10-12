import { useEffect, useRef, useState } from 'react'
import LOGO from '../../../assets/lume-logo.png'
import { drawStory, storyBlob } from './storyArt'
import { decodeStory } from './storyData'

/**
 * Página aberta pelo QR code no celular do visitante (#arte=...).
 * Não carrega o jogo 3D: só desenha a arte e oferece compartilhar.
 * O Instagram não aceita arte pronta por link, então o caminho é o menu de
 * compartilhar do celular (Web Share com arquivo), que lista "Instagram › Stories".
 */
export function SharePage({ code }: { code: string }) {
  const data = decodeStory(code)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<{ url: string; file: File } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

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

  const share = async () => {
    if (!img) return
    try {
      await navigator.share({ files: [img.file], title: 'Lumis Run 3D' })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg('O compartilhamento não abriu. Salve a imagem e poste nos stories.')
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

  return (
    <main className="lr-share-page">
      <img src={LOGO} alt="Lume" className="lr-share-logo" />
      <h1>Sua arte do Lumis Run</h1>
      <p className="lr-share-lead">Poste nos stories e marque a Lume!</p>
      <canvas ref={canvas} hidden />
      <div className="lr-share-art">{img ? <img src={img.url} alt={`Arte com ${data.score} pontos e ${data.books} livros`} /> : <span>Gerando a arte…</span>}</div>
      <div className="lr-share-actions">
        {canShareFile && (
          <button className="lr-cta" onClick={share}>
            Compartilhar nos stories
          </button>
        )}
        {img && (
          <a className={canShareFile ? 'lr-btn' : 'lr-cta'} href={img.url} download="lumis-run-stories.png">
            Salvar imagem
          </a>
        )}
      </div>
      <ol className="lr-share-steps">
        {canShareFile ? (
          <>
            <li>Toque em <strong>Compartilhar nos stories</strong>.</li>
            <li>Escolha <strong>Instagram</strong> e depois <strong>Stories</strong>.</li>
          </>
        ) : (
          <>
            <li>Toque em <strong>Salvar imagem</strong> (ou segure a imagem e salve).</li>
            <li>Abra o Instagram, crie um story e escolha a imagem da galeria.</li>
          </>
        )}
      </ol>
      {msg && <p className="lr-error">{msg}</p>}
    </main>
  )
}
