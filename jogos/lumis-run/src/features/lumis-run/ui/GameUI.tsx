import { useEffect, useState } from 'react'
import { installAudioUnlock, sound } from '../audio/sound'
import { photos } from '../ranking/photos'
import { input } from '../input/inputManager'
import { session } from '../session'
import LOGO from '../../../assets/lume-logo.png'
import { Countdown, GameOverScreen, Hud, PadChip, PauseScreen, RankingScreen, ShareScreen } from './screens/GameScreens'
import { MenuScreen } from './screens/MenuScreen'
import { NameScreen } from './screens/NameScreen'
import { StaffScreen } from './screens/StaffScreen'
import { useUi } from './uiStore'
import { useSound } from './useInput'

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen()
  else void document.documentElement.requestFullscreen?.().catch(() => {})
}

function TopBar({ compact }: { compact: boolean }) {
  const fps = useUi((s) => s.fps)
  const quality = useUi((s) => s.quality)
  const [debug, setDebug] = useState(() => location.hash === '#debug')
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'KeyI' && (e.target as HTMLElement)?.tagName !== 'INPUT') setDebug((d) => !d)
      if (e.code === 'KeyF' && (e.target as HTMLElement)?.tagName !== 'INPUT') toggleFullscreen()
      if (e.code === 'KeyM' && (e.target as HTMLElement)?.tagName !== 'INPUT') sound.setMuted(!sound.prefs.muted)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <div className="lr-top">
      <img src={LOGO} alt="Lume" className={`lr-logo${compact ? ' is-compact' : ''}`} />
      <div className="lr-top-right">
        {debug && (
          <span className="lr-chip lr-mono" title="Quadros por segundo e nível de qualidade automática">
            {fps || '–'} FPS · Q{quality}
          </span>
        )}
        <PadChip />
        <MuteButton />
        <button className="lr-icon-btn" onClick={toggleFullscreen} aria-label="Tela cheia" title="Tela cheia (F)">
          ⛶
        </button>
      </div>
    </div>
  )
}

function MuteButton() {
  useSound()
  const muted = sound.prefs.muted
  return (
    <button className="lr-icon-btn" onClick={() => sound.setMuted(!muted)} aria-label={muted ? 'Ligar o som' : 'Desligar o som'} title={muted ? 'Ligar o som (M)' : 'Desligar o som (M)'}>
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

export function GameUI() {
  const screen = useUi((s) => s.screen)
  const webglError = useUi((s) => s.webglError)
  useEffect(() => {
    input.start()
    void session // garante que a sessão exista e escute a entrada
    installAudioUnlock()
    photos.init()
    sound.music('menu')
    // som de clique em qualquer botão (mouse, toque, A ou Enter)
    const click = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('button')) sound.play('click')
    }
    window.addEventListener('click', click, true)
    return () => window.removeEventListener('click', click, true)
  }, [])
  const playing = screen === 'jogo' || screen === 'contagem'
  return (
    <div className="lr-ui">
      <div className="lr-vignette" aria-hidden="true" />
      <TopBar compact={playing} />
      {screen === 'menu' && <MenuScreen />}
      {screen === 'nome' && <NameScreen />}
      {screen === 'contagem' && <Countdown />}
      {screen === 'jogo' && <Hud />}
      {screen === 'pausa' && <PauseScreen />}
      {screen === 'fim' && <GameOverScreen />}
      {screen === 'compartilhar' && <ShareScreen />}
      {screen === 'ranking' && <RankingScreen />}
      {screen === 'equipe' && <StaffScreen />}
      {webglError && <div className="lr-toast">{webglError}</div>}
    </div>
  )
}
