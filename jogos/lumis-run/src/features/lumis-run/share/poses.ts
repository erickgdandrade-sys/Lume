import COM_CORACAO from '../../../assets/poses/coracao.webp'
import FORMATURA from '../../../assets/poses/formatura.webp'
import IDEIA from '../../../assets/poses/ideia.webp'
import JOINHA from '../../../assets/poses/joinha.webp'
import LAPIS from '../../../assets/poses/lapis.webp'
import LENDO from '../../../assets/poses/lendo.webp'
import MOCHILA from '../../../assets/poses/mochila.webp'
import NOTEBOOK from '../../../assets/poses/notebook.webp'
import OLA from '../../../assets/poses/ola.webp'
import PISCADINHA from '../../../assets/poses/piscadinha.webp'
import RESPIRA from '../../../assets/poses/respira.webp'
import UHUU from '../../../assets/poses/uhuu.webp'
import VAI_DAR_CERTO from '../../../assets/poses/vai-dar-certo.webp'

/**
 * Imagens oficiais da Lumis (recortadas por scripts/recortar-poses.py).
 * Cada arte dos stories sorteia uma. A ordem não pode mudar: o número da pose
 * vai no link do QR (#arte=...).
 */
export const POSES = [MOCHILA, NOTEBOOK, FORMATURA, LAPIS, OLA, PISCADINHA, COM_CORACAO, LENDO, UHUU, IDEIA, JOINHA, RESPIRA, VAI_DAR_CERTO] as const

export function randomPose() {
  return Math.floor(Math.random() * POSES.length)
}

/** pose estável para links antigos sem o número da pose */
export function poseFor(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % POSES.length
}
