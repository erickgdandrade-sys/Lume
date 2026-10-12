// Gera src/assets/lumis-*.png (Lumis em fundo transparente) a partir do próprio modelo 3D.
import { chromium } from 'playwright-core'
const url = process.argv[2] || 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
for (const expr of ['alegria', 'feliz']) {
  const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
  await p.goto(`${url}?lumis-foto=${expr}`)
  await p.waitForTimeout(3500)
  await p.screenshot({ path: `src/assets/lumis-${expr}.png`, omitBackground: true })
  await p.close()
}
await b.close()
