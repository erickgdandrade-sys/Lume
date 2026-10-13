// Teste ponta a ponta do ranking ONLINE: dois aparelhos (stand e outro computador)
// contra o servidor local (scripts/local-server.mjs, mesma lógica da Edge Function).
// Uso: node scripts/e2e-online.mjs <pasta-capturas> [url-do-jogo] [url-do-servidor]
import { chromium } from 'playwright-core'
const out = process.argv[2] || 'e2e-online'
const url = process.argv[3] || 'http://localhost:4174/'
const api = process.argv[4] || 'http://localhost:8787'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASSOU' : 'FALHOU'}  ${name}${extra ? ' — ' + extra : ''}`)
const errors = []

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
const offline = (v) => fetch(`${api}/__offline?v=${v ? 1 : 0}`)
await offline(false)
await fetch(`${api}/equipe`, { method: 'POST', body: JSON.stringify({ senha: 'senha-local', acao: 'limpar' }) })

async function device(name, viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  await page.goto(url)
  await page.waitForTimeout(3000)
  await page.mouse.click(5, 5)
  return page
}
const text = (p) => p.evaluate(() => document.querySelector('.lr-ui')?.innerText ?? '')
const wait = (p, ms) => p.waitForTimeout(ms)

/** joga uma partida sem mexer (bate no primeiro obstáculo) e cadastra */
async function playAndRegister(p, name, phone, { photo = false } = {}) {
  await p.keyboard.press('Enter')
  for (let i = 0; i < 160 && !/Fim de corrida/i.test(await text(p)); i++) await wait(p, 500)
  await wait(p, 600)
  await p.getByRole('button', { name: /Entrar no ranking|Salvar como/ }).first().click()
  await wait(p, 600)
  if (await p.locator('#lr-nome').count()) {
    await p.fill('#lr-nome', name)
    await p.keyboard.press('Enter')
    await p.fill('#lr-whats', phone)
    await p.keyboard.press('Enter')
    await wait(p, 1500)
  }
  if (/Continuar|Corrigir os dados/.test(await text(p))) {
    await p.getByRole('button', { name: /Continuar/ }).click()
    await wait(p, 600)
  }
  if (photo) {
    await p.getByRole('button', { name: /Tirar foto/ }).click()
    await p.waitForFunction(() => (document.querySelector('.lr-camera video')?.videoWidth ?? 0) > 0, null, { timeout: 15000 }).catch(() => {})
    await p.getByRole('button', { name: /Tirar foto/ }).click()
    await wait(p, 3600)
    await p.getByRole('button', { name: /Usar esta foto/ }).click()
  } else {
    await p.getByRole('button', { name: /Sem foto/ }).first().click()
  }
  await p.waitForFunction(() => /sua posição|Partida/i.test(document.querySelector('.lr-ui')?.innerText ?? ''), null, { timeout: 20000 }).catch(() => {})
  await wait(p, 500)
  return text(p)
}

// ---- aparelho 1: o computador do stand
const stand = await device('stand')
check('menu avisa que o ranking é online', /Ranking online, igual em todos os aparelhos/.test(await text(stand)))
const t1 = await playAndRegister(stand, 'Ana Online', '48999991111', { photo: true })
check('partida validada pelo servidor entra em 1º', /Ana Online, sua posição/.test(t1) && /1º\s*em pontos/.test(t1), t1.split('\n').slice(0, 8).join(' | '))
await stand.screenshot({ path: `${out}/01-stand-posicao.png` })

// ---- aparelho 2: outro computador/celular abre o jogo e vê o mesmo ranking
const other = await device('outro', { width: 1024, height: 700 })
await other.getByRole('button', { name: /Ver rankings/ }).first().click()
await wait(other, 800)
const r2 = await text(other)
check('outro aparelho vê a mesma pessoa no ranking', /Ana Online/.test(r2), r2.split('\n').slice(0, 10).join(' | '))
check('a foto vem do servidor no outro aparelho', await other.evaluate(() => [...document.querySelectorAll('img.lr-avatar')].some((i) => i.src.includes('/fotos/') && i.naturalWidth > 0)))
check('WhatsApp não aparece no ranking público', !/99999|1111/.test(r2))
await other.screenshot({ path: `${out}/02-outro-aparelho.png` })

// ---- partida no outro aparelho aparece no stand sem recarregar
await other.keyboard.press('Escape')
await wait(other, 500)
await playAndRegister(other, 'Bia Online', '48988882222')
await stand.getByRole('button', { name: /Próximo jogador/ }).click()
await wait(stand, 500)
await stand.evaluate(() => window.dispatchEvent(new Event('online'))) // força a atualização em vez de esperar 15 s
await wait(stand, 1500)
check('o stand recebe a partida do outro aparelho', /Bia Online/.test(await text(stand)), (await text(stand)).split('\n').slice(0, 14).join(' | '))

// ---- aviso de mesmo nome e WhatsApp consulta o servidor
const t3pre = await (async () => {
  await stand.keyboard.press('Enter')
  for (let i = 0; i < 160 && !/Fim de corrida/i.test(await text(stand)); i++) await wait(stand, 500)
  await wait(stand, 600)
  await stand.getByRole('button', { name: /Entrar no ranking/ }).click()
  await wait(stand, 500)
  await stand.fill('#lr-nome', 'bia online')
  await stand.keyboard.press('Enter')
  await stand.fill('#lr-whats', '(48) 98888-2222')
  await stand.keyboard.press('Enter')
  await wait(stand, 1500)
  return text(stand)
})()
check('mesmo nome e WhatsApp de outro aparelho mostra o aviso', /já está no ranking/.test(t3pre), t3pre.split('\n').slice(0, 6).join(' | '))
await stand.getByRole('button', { name: /Corrigir os dados/ }).click()
await wait(stand, 300)

// ---- sem internet: a partida fica guardada e é enviada quando volta
await stand.fill('#lr-nome', 'Caio Offline')
await stand.keyboard.press('Enter')
await stand.fill('#lr-whats', '48977773333')
await offline(true)
await stand.keyboard.press('Enter')
await wait(stand, 1200)
if (/Continuar/.test(await text(stand))) await stand.getByRole('button', { name: /Continuar/ }).click()
await stand.getByRole('button', { name: /Sem foto/ }).first().click()
const t0 = Date.now()
await stand.waitForFunction(() => /Sem internet agora|Partida não validada/i.test(document.querySelector('.lr-ui')?.innerText ?? ''), null, { timeout: 30000 }).catch(() => {})
const t4 = await text(stand)
const offlineWait = Date.now() - t0
check('sem internet a partida fica guardada e avisa', /Sem internet agora/.test(t4), `${(offlineWait / 1000).toFixed(1)} s · ` + t4.split('\n').slice(0, 10).join(' | '))
await stand.screenshot({ path: `${out}/03-sem-internet.png` })
await stand.getByRole('button', { name: /Ver rankings/ }).click()
await wait(stand, 600)
check('ranking mostra que está sem internet e a partida esperando', /Sem internet: mostrando o último ranking/.test(await text(stand)) && /1 partida esperando envio/.test(await text(stand)))
await offline(false)
await stand.evaluate(() => window.dispatchEvent(new Event('online')))
await wait(stand, 2500)
const t5 = await text(stand)
check('quando a internet volta a partida é enviada e entra no ranking', /Caio Offline/.test(t5) && !/esperando envio/.test(t5) && /Ranking online/.test(t5), t5.split('\n').slice(0, 14).join(' | '))
await stand.screenshot({ path: `${out}/04-voltou-internet.png` })

// ---- área da equipe com a senha do servidor
await stand.getByRole('button', { name: /Área da equipe/ }).click()
await wait(stand, 400)
check('área da equipe pede a senha', /Digite a senha da equipe/.test(await text(stand)))
await stand.fill('#lr-pin', 'errada')
await stand.keyboard.press('Enter')
await wait(stand, 1500)
check('senha errada é recusada', /Senha incorreta/.test(await text(stand)))
await stand.fill('#lr-pin', 'senha-local')
await stand.keyboard.press('Enter')
await wait(stand, 1500)
const st = await text(stand)
check('equipe vê os 3 jogadores com WhatsApp', /3 jogadores no ranking online/.test(st) && /\(48\) 99999-1111/.test(st) && /\(48\) 97777-3333/.test(st), st.split('\n').slice(0, 12).join(' | '))
check('equipe vê a foto vinda do servidor', await stand.evaluate(() => [...document.querySelectorAll('.lr-staff-table img.lr-avatar')].length >= 1))
await stand.screenshot({ path: `${out}/05-equipe.png` })

// ---- pontuação adulterada é recusada pelo servidor
const forged = await stand.evaluate(async (api) => {
  const t = await (await fetch(api + '/bilhete', { method: 'POST' })).json()
  const r = await fetch(api + '/partida', { method: 'POST', body: JSON.stringify({ token: t.token, commands: [], name: 'Hacker', phone: '48966664444', claimed: { score: 999999, books: 99 } }) })
  return r.status
}, api)
check('pontuação inventada pelo navegador é recusada', forged === 422, String(forged))

check('sem erros de JavaScript', errors.length === 0, errors.join(' / '))
await browser.close()
for (const r of results) console.log(r)
console.log(`${results.filter((r) => r.startsWith('PASSOU')).length} de ${results.length} passaram`)
