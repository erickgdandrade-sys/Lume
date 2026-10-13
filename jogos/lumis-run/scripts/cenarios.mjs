// Capturas dos cenários e da transição de nível (?nivel=N começa pouco antes da janela).
// Uso: node scripts/cenarios.mjs <pasta> [url] [níveis separados por vírgula] [capturas por nível]
import { chromium } from 'playwright-core'
const out = process.argv[2] || 'cenarios'
const url = process.argv[3] || 'http://localhost:4173/'
const levels = (process.argv[4] || '2,3,4,5,6,7,8,9,10').split(',').map(Number)
const shots = Number(process.argv[5] || 8)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
for (const n of levels) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', (e) => errors.push(`nível ${n}: ${e.message}`))
  await page.goto(`${url}?nivel=${n}`)
  await page.waitForTimeout(2500)
  await page.mouse.click(5, 5)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(Number(process.env.ESPERA || 3200))
  const seen = []
  for (let i = 0; i < shots; i++) {
    const info = await page.evaluate(() => ({ o: globalThis.__lumisPose?.overlay ?? '', fps: document.querySelector('.lr-mono')?.textContent ?? '' }))
    seen.push(info.o || '-')
    await page.screenshot({ path: `${out}/n${String(n).padStart(2, '0')}-${i}.png` })
    await page.waitForTimeout(450)
  }
  console.log(`nível ${n}: ${seen.join(' ')}`)
  await page.close()
}
console.log(errors.length ? errors.join('\n') : 'sem erros de JavaScript')
await browser.close()
