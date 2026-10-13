import { useSyncExternalStore } from 'react'
import { photos } from '../ranking/photos'

const COLORS = ['#3B82F6', '#F472B6', '#FBBF24', '#34D399', '#8B5CF6', '#FB923C']

/** foto do jogador, ou a inicial do nome num círculo colorido */
export function Avatar({ id, name, photo, size = 32 }: { id: string; name: string; photo?: string; size?: number }) {
  useSyncExternalStore((cb) => photos.subscribe(cb), () => photos.stamp, () => 0)
  // foto guardada nesta máquina (aparece na hora) ou a do ranking online
  const src = photos.get(id) ?? photo
  const style = { width: size, height: size, fontSize: size * 0.45 }
  if (src) return <img className="lr-avatar" src={src} alt="" style={style} loading="lazy" decoding="async" />
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span className="lr-avatar lr-avatar-letter" style={{ ...style, background: COLORS[h % COLORS.length] }} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
