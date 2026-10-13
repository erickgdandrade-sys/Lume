import { lazy, Suspense, useMemo } from 'react'
import { GameUI } from './features/lumis-run/ui/GameUI'
import { storyCodeFromHash } from './features/lumis-run/share/storyData'
import { hasWebGL2 } from './features/lumis-run/ui/webgl'

const LumisPhoto = lazy(() => import('./features/lumis-run/render/LumisPhoto').then((m) => ({ default: m.LumisPhoto })))
const SharePage = lazy(() => import('./features/lumis-run/share/SharePage').then((m) => ({ default: m.SharePage })))
const GameCanvas = lazy(() => import('./features/lumis-run/render/GameCanvas').then((m) => ({ default: m.GameCanvas })))

export function App() {
  const supported = useMemo(hasWebGL2, [])
  const photo = new URLSearchParams(location.search).get('lumis-foto')
  // aberto pelo QR code no celular: só a arte dos stories, sem o jogo 3D
  const story = storyCodeFromHash()
  if (story) {
    return (
      <Suspense fallback={null}>
        <SharePage code={story} />
      </Suspense>
    )
  }
  if (photo) {
    document.documentElement.style.background = document.body.style.background = 'transparent'
    document.getElementById('root')!.style.background = 'transparent'
    return (
      <Suspense fallback={null}>
        <LumisPhoto expression={photo as 'alegria'} wave={Number(new URLSearchParams(location.search).get('tchau')) || 0} front={new URLSearchParams(location.search).has('frente')} />
      </Suspense>
    )
  }
  if (!supported) {
    return (
      <div className="lr-unsupported">
        <h1>Este navegador não consegue mostrar o jogo</h1>
        <p>O Lumis Run 3D precisa de WebGL 2. Abra no Chrome, Edge ou Firefox atualizados e confira se a aceleração de hardware está ativada.</p>
      </div>
    )
  }
  return (
    <>
      <Suspense fallback={<div className="lr-loading">Carregando a escola…</div>}>
        <GameCanvas />
      </Suspense>
      <GameUI />
    </>
  )
}
