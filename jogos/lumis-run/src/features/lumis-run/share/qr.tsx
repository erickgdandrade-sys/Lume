import qrcode from 'qrcode-generator'
import { useMemo } from 'react'

/** QR em SVG (nítido em qualquer tamanho), com margem branca */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
    return { n: n + 8, d }
  }, [value])
  return (
    <svg className="lr-qr" viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#0F172A" />
    </svg>
  )
}
