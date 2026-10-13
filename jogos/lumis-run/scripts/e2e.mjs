// Teste ponta a ponta no Chromium headless: fluxo completo com teclado e com controle Xbox simulado.
// Uso: node scripts/e2e.mjs <pasta-capturas> [url]
import { chromium } from 'playwright-core'
const out = process.argv[2] || 'e2e'
const url = process.argv[3] || 'http://localhost:4173/'
const results = []
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASSOU' : 'FALHOU'}  ${name}${extra ? ' — ' + extra : ''}`)
process.on('uncaughtException', (e) => { console.log(results.join('\n')); console.log('ERRO:', e.message.split('\n')[0]); process.exit(1) })

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] })
const page = await browser.newPage({ viewport: { width: Number(process.env.E2E_W || 1280), height: Number(process.env.E2E_H || 720) } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.addInitScript(() => {
  const mk = () => ({ index: 0, id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', mapping: 'standard', connected: true, timestamp: 0, buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] })
  window.__pad = mk()
  window.__padOn = false
  navigator.getGamepads = () => (window.__padOn ? [window.__pad] : [])
})
const text = () => page.evaluate(() => document.querySelector('.lr-ui')?.innerText ?? '')
const wait = (ms) => page.waitForTimeout(ms)
const padPress = async (i, hold = 450) => {
  await page.evaluate((i) => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1 }, i)
  await wait(hold)
  await page.evaluate((i) => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0 }, i)
  await wait(hold)
}

const waitOver = async (shot) => {
  for (let i = 0; i < 160; i++) {
    await wait(500)
    if (/Fim de corrida/i.test(await text())) return true
    if (shot && i % 6 === 0) await page.screenshot({ path: `${out}/${shot}` })
  }
  return false
}

await page.goto(url)
await page.evaluate(() => localStorage.clear())
await page.reload()
await wait(4000)
await page.screenshot({ path: `${out}/01-menu.png` })
check('menu mostra JOGAR e o título', /JOGAR/.test(await text()) && /Lumis/.test(await text()))
check('antes do primeiro gesto o menu pede um clique para o som', /Clique ou aperte uma tecla para ligar a música/.test(await text()))
const audio = () => page.evaluate(() => window.__lumisAudio)
await page.keyboard.press('KeyM')
await wait(200)
check('M desliga o som', (await audio())?.muted === true)
await page.keyboard.press('KeyM')
await wait(300)
const a0 = await audio()
check('primeira tecla libera o áudio e toca a música do menu', a0?.state === 'running' && a0?.track === 'menu' && a0?.muted === false, JSON.stringify(a0))

// ---- teclado: JOGAR começa direto, cadastro no fim
await page.keyboard.press('Enter')
// Lumis na contagem: de frente para a câmera dando tchau
const poses = []
for (let i = 0; i < 6; i++) {
  poses.push(await page.evaluate(() => ({ ...window.__lumisPose })))
  if (i === 2) await page.screenshot({ path: `${out}/02a-tchau-contagem.png` })
  await wait(220)
}
const waves = poses.filter((p) => p.mode === 'greet').map((p) => p.wave)
check('na contagem a Lumis dá tchau para a câmera', waves.length >= 3 && Math.max(...waves) - Math.min(...waves) > 0.15, JSON.stringify(poses.map((p) => [p.mode, +p.wave.toFixed(2)])))
check('contagem toca bipes e para a música do menu', (await audio())?.stats?.count >= 1 && (await audio())?.track === null)
await wait(200)
check('JOGAR começa a contagem direto, sem pedir nome', /Prepare-se!/.test(await text()) && !/Qual é o seu nome/.test(await text()))
await page.screenshot({ path: `${out}/02-contagem.png` })
// a contagem anda no tempo do jogo; em máquinas lentas (renderização por software) ela demora mais
for (let i = 0; i < 40 && !/pontos/i.test(await text()); i++) await wait(250)
await wait(600)
const t1 = await text()
check('HUD com pontos e controles à esquerda', /pontos/i.test(t1) && /Trocar de faixa/.test(t1))
const a1 = await audio()
check('na largada toca o "Já" e a música da corrida', a1?.track === 'run' && a1?.stats?.go === 1, JSON.stringify(a1?.stats))
await page.keyboard.press('ArrowUp')
await wait(500)
check('pulo toca o efeito de pulo', (await audio())?.stats?.jump >= 1)
await page.screenshot({ path: `${out}/03-jogo.png` })
await page.keyboard.press('Escape')
await wait(600)
check('Esc pausa', /Pausado/i.test(await text()))
await page.keyboard.press('Enter')
for (let i = 0; i < 48 && /Pausado|^\s*[123]\s*$/m.test(await text()); i++) await wait(250)
await wait(300)
check('Continuar volta ao jogo', /pontos/i.test(await text()) && !/Pausado/i.test(await text()))
check('colisão encerra a partida e mostra o resultado', await waitOver('04-corrida.png'))
const a2 = await audio()
check('batida toca o efeito e o fim toca a vinheta', a2?.stats?.crash >= 1 && a2?.stats?.fim >= 1, JSON.stringify(a2?.stats))
await wait(800)
await page.screenshot({ path: `${out}/05-fim.png` })
const fim = await text()
check('fim mostra a posição que a pessoa teria nos dois rankings', /1º em pontos/.test(fim) && /1º em livros/.test(fim), fim.split('\n').slice(0, 14).join(' | '))
check('fim convida a entrar no ranking', /Entrar no ranking/.test(fim))

// cadastro
await page.keyboard.press('Enter')
await wait(800)
check('cadastro pede nome e WhatsApp', /Seu nome/.test(await text()) && /WhatsApp/.test(await text()))
await page.keyboard.type('A')
await page.keyboard.press('Enter')
await wait(400)
check('nome curto é recusado', /pelo menos 2 letras/.test(await text()))
await page.keyboard.type('na Teste')
await page.keyboard.press('Enter')
await wait(400)
check('Enter no nome passa para o WhatsApp', await page.evaluate(() => document.activeElement?.id === 'lr-whats'))
await page.keyboard.press('Enter')
await wait(400)
check('WhatsApp vazio é recusado', /Coloque seu WhatsApp/.test(await text()))
await page.keyboard.type('48999')
await page.keyboard.press('Enter')
await wait(400)
check('WhatsApp incompleto é recusado', /Digite o DDD e o número/.test(await text()))
await page.keyboard.type('991111')
const shown = await page.inputValue('#lr-whats')
check('WhatsApp aparece formatado', shown === '(48) 99999-1111', shown)
await page.screenshot({ path: `${out}/06-cadastro.png` })
await page.keyboard.press('Enter')
await wait(800)
check('depois do WhatsApp pede autorização para a foto', /quer aparecer com foto/i.test(await text()) && /é opcional/i.test(await text()))
await page.screenshot({ path: `${out}/06a-foto-pedir.png` })
await page.keyboard.press('Enter') // Tirar foto
await page.waitForFunction(() => { const v = document.querySelector('.lr-camera video'); return v && v.videoWidth > 0 }, null, { timeout: 15000 }).catch(() => {})
check('câmera abre com imagem ao vivo', await page.evaluate(() => (document.querySelector('.lr-camera video')?.videoWidth ?? 0) > 0))
await page.keyboard.press('Enter') // contagem 3, 2, 1
await wait(900)
await page.screenshot({ path: `${out}/06b-foto-contagem.png` })
await wait(2600)
check('contagem tira a foto e mostra para conferir', /Usar esta foto/.test(await text()) && (await page.locator('.lr-camera img').count()) === 1)
await page.screenshot({ path: `${out}/06c-foto-revisar.png` })
await page.keyboard.press('Enter') // Usar esta foto
await wait(2500)
const sh = await text()
check('depois do cadastro mostra as posições nos dois rankings', /Ana Teste, sua posição/.test(sh) && /1º\s*em pontos/.test(sh) && /1º\s*em livros/.test(sh), sh.split('\n').slice(0, 12).join(' | '))
check('foto aparece na tela final', await page.evaluate(() => [...document.querySelectorAll('img.lr-avatar')].some((i) => i.src.startsWith('data:image/jpeg'))))
check('câmera foi desligada depois da foto', await page.evaluate(() => !document.querySelector('.lr-camera video')))
await page.waitForSelector('.lr-story-preview img', { timeout: 10000 }).catch(() => {})
check('tela final tem QR code e prévia da arte', (await page.locator('svg.lr-qr').count()) === 1 && (await page.locator('.lr-story-preview img').count()) === 1)
check('aviso de endereço não público aparece em localhost', /só abre no celular quando o jogo estiver publicado/.test(sh))
await page.screenshot({ path: `${out}/07-qr.png` })
// arte gerada em tamanho real
const art = await page.evaluate(async () => {
  const img = document.querySelector('.lr-story-preview img')
  await img.decode()
  return [img.naturalWidth, img.naturalHeight]
})
check('arte tem 1080×1920', art[0] === 1080 && art[1] === 1920, art.join('×'))
const artB64 = await page.evaluate(async () => {
  const b = await (await fetch(document.querySelector('.lr-story-preview img').src)).blob()
  return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(b) })
})
const fs = await import('node:fs')
fs.writeFileSync(`${out}/08-arte-stories.png`, Buffer.from(artB64, 'base64'))

// rankings
await page.getByRole('button', { name: 'Ver rankings' }).click()
await wait(800)
const rk = await text()
check('dois rankings listam o jogador', /Mais pontos/.test(rk) && /Mais livros/.test(rk) && (rk.match(/Ana Teste/g) || []).length === 2)
check('WhatsApp não aparece no ranking', !/99999|1111/.test(rk))
check('ranking mostra a foto do jogador', (await page.locator('.lr-rank img.lr-avatar').count()) === 2)
await page.screenshot({ path: `${out}/09-rankings.png` })

// área da equipe
await page.getByRole('button', { name: 'Área da equipe' }).click()
await wait(500)
await page.keyboard.type('0000')
await page.keyboard.press('Enter')
await wait(400)
check('PIN errado é recusado', /PIN incorreto/.test(await text()))
await page.keyboard.type('2026')
await page.keyboard.press('Enter')
await wait(600)
const st = await text()
check('área da equipe mostra o contato', /Ana Teste/.test(st) && /\(48\) 99999-1111/.test(st))
check('área da equipe mostra a foto', (await page.locator('.lr-staff-table img.lr-avatar').count()) === 1)
check('link do WhatsApp para a equipe', (await page.locator('a[href="https://wa.me/5548999991111"]').count()) === 1)
await page.screenshot({ path: `${out}/10-equipe.png` })
await page.getByRole('button', { name: 'Fechar' }).click()
await wait(500)
await page.keyboard.press('Escape')
await wait(600)
check('Voltar do ranking retorna à tela do QR', /sua posição/.test(await text()))

// jogar de novo: a mesma pessoa salva com um toque
await page.keyboard.press('Enter')
await wait(5000)
check('segunda partida termina', await waitOver())
await wait(800)
check('fim oferece "Salvar como Ana Teste"', /Salvar como Ana Teste/.test(await text()))
await page.getByRole('button', { name: 'Não sou Ana Teste' }).click()
await wait(600)
// mesmo nome e mesmo WhatsApp digitados: aviso
await page.keyboard.type('ana teste')
await page.keyboard.press('Enter')
await wait(300)
await page.keyboard.type('48 99999-1111')
await page.keyboard.press('Enter')
await wait(800)
check('mesmo nome e mesmo WhatsApp mostram o aviso', /já está no jogo/.test(await text()))
await page.screenshot({ path: `${out}/11-mesmo-nome.png` })
await page.keyboard.press('Escape')
await wait(500)
check('"Corrigir os dados" volta ao formulário', !/já está no jogo/.test(await text()) && /Seu nome/.test(await text()))
// mesmo nome com outro WhatsApp: pessoa diferente, sem aviso
await page.fill('#lr-whats', '')
await page.focus('#lr-whats')
await page.keyboard.type('11988887777')
await page.keyboard.press('Enter')
await wait(800)
await page.getByRole('button', { name: 'Sem foto' }).click()
await wait(1500)
check('mesmo nome com outro WhatsApp entra sem aviso', /sua posição/.test(await text()) && !/já está no jogo/.test(await text()))
await page.keyboard.press('Escape') // próximo jogador
await wait(800)
check('Próximo jogador volta ao menu', /JOGAR/.test(await text()))
check('foto continua salva depois de recarregar', await (async () => {
  await page.reload()
  await wait(4000)
  return page.evaluate(() => [...document.querySelectorAll('.lr-mini-rank img.lr-avatar')].length >= 1)
})())
const mini = await text()
check('menu mostra os dois rankings', /Mais pontos/i.test(mini) && /Mais livros/i.test(mini))
await page.screenshot({ path: `${out}/12-menu-rankings.png` })

// página da arte no celular (aberta pelo QR)
const code = Buffer.from(JSON.stringify({ v: 1, n: 'Ana Teste', s: 1234, b: 17, d: 980, p: 2, l: 1 })).toString('base64url')
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
phone.on('pageerror', (e) => errors.push(e.message))
await phone.goto(url + '#arte=' + code)
await phone.waitForSelector('.lr-share-art img', { timeout: 15000 }).catch(() => {})
await wait(500)
const pg = await phone.evaluate(() => document.body.innerText)
check('página do QR mostra a arte e o botão de salvar', /Sua arte está pronta/.test(pg) && /Salvar imagem/i.test(pg) && (await phone.locator('.lr-share-art img').count()) === 1)
check('página do QR não carrega o jogo 3D', (await phone.locator('canvas:not([hidden])').count()) === 0 && !/JOGAR/.test(pg))
await phone.screenshot({ path: `${out}/13-celular-arte.png`, fullPage: true })
await phone.close()
// celular Android com menu de compartilhar: um toque entrega a arte pronta ao Instagram
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
const mockShare = () => {
  window.__shared = null
  navigator.canShare = (d) => !!d && Array.isArray(d.files) && d.files.length > 0
  navigator.share = async (d) => {
    const f = d.files[0]
    const bmp = await createImageBitmap(f)
    window.__shared = { n: d.files.length, type: f.type, name: f.name, w: bmp.width, h: bmp.height, text: d.text ?? null }
  }
}
const phone3 = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: ANDROID_UA })
phone3.on('pageerror', (e) => errors.push(e.message))
await phone3.addInitScript(mockShare)
await phone3.goto(url + '#arte=' + code)
await phone3.waitForSelector('.lr-insta', { timeout: 15000 }).catch(() => {})
const pg3 = await phone3.evaluate(() => document.body.innerText)
check('celular: botão "Postar no Instagram" aparece no topo', (await phone3.locator('.lr-insta').count()) === 1 && /Stories/.test(pg3))
await phone3.locator('.lr-insta').click()
await phone3.waitForFunction(() => window.__shared, null, { timeout: 5000 }).catch(() => {})
const shared = await phone3.evaluate(() => window.__shared)
check('um toque envia a arte PNG 1080x1920 ao menu de compartilhar', !!shared && shared.n === 1 && shared.type === 'image/png' && shared.w === 1080 && shared.h === 1920 && shared.text === null)
check('depois de compartilhar mostra "Agora é só postar"', /Agora é só postar/.test(await phone3.evaluate(() => document.body.innerText)))
await phone3.screenshot({ path: `${out}/13b-celular-instagram.png`, fullPage: true })
await phone3.close()
// aberto dentro do app do Instagram: avisa para abrir no navegador
const phone4 = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: ANDROID_UA + ' Instagram 300.0.0.0' })
await phone4.addInitScript(mockShare)
await phone4.goto(url + '#arte=' + code)
await phone4.waitForSelector('.lr-share-art img', { timeout: 15000 }).catch(() => {})
const pg4 = await phone4.evaluate(() => document.body.innerText)
check('navegador do Instagram: pede para abrir no navegador e oferece salvar + abrir stories', /Abrir no navegador/.test(pg4) && /Salvar imagem/i.test(pg4) && (await phone4.locator('a[href="instagram://story-camera"]').count()) === 1)
await phone4.close()
const phone2 = await browser.newPage({ viewport: { width: 390, height: 844 } })
await phone2.goto(url + '#arte=lixo')
await phone2.waitForSelector('h1', { timeout: 10000 }).catch(() => {})
check('link inválido mostra aviso', /Link inválido/.test(await phone2.evaluate(() => document.body.innerText)))
await phone2.close()

// ---- controle Xbox simulado
await page.evaluate(() => { window.__padOn = true })
await wait(800)
check('controle conectado aparece na tela', /Controle Xbox conectado/.test(await text()))
await padPress(0) // A no menu: Jogar
check('A no menu começa a partida', /Prepare-se/.test(await text()))
for (let i = 0; i < 40 && /Prepare-se|Já!/.test(await text()); i++) await wait(250)
await wait(400)
check('dicas mostram os botões do controle', /Pular/.test(await text()) && /Deslizar/.test(await text()))
await page.screenshot({ path: `${out}/14-jogo-controle.png` })
const x0 = await page.evaluate(() => window.__lumisDebug?.x)
await page.evaluate(() => { window.__pad.axes[0] = -0.95 })
await wait(700)
await page.evaluate(() => { window.__pad.axes[0] = 0 })
await wait(300)
const x1 = await page.evaluate(() => window.__lumisDebug?.x)
check('analógico troca uma faixa', x0 === 0 && Math.abs(x1 + 2.2) < 0.01, `x antes ${x0}, depois ${x1}`)
check('troca de faixa toca o efeito', (await audio())?.stats?.lane >= 1)
await page.evaluate(() => {
  window.__padOn = false
  const e = new Event('gamepaddisconnected')
  Object.defineProperty(e, 'gamepad', { value: window.__pad })
  window.dispatchEvent(e)
})
await wait(700)
const tp = await text()
check('desconectar o controle pausa sem perder a partida', /Pausado/i.test(tp) && /controle foi desconectado/.test(tp))
check('pausa tem o botão de música', /Música: ligada/.test(tp))
await page.evaluate(() => { window.__padOn = true })
await wait(600)
await padPress(0)
for (let i = 0; i < 48 && /Pausado|^\s*[123]\s*$/m.test(await text()); i++) await wait(250)
await wait(300)
check('reconectar e apertar A continua a partida', /pontos/i.test(await text()) && !/Pausado/i.test(await text()))
check('partida com controle termina', await waitOver())
await wait(800)
await padPress(0) // A: colocar nome
check('A no fim abre o cadastro', /Seu nome/.test(await text()))
await padPress(0) // "A"
await page.evaluate(() => { window.__pad.axes[0] = 0.95 })
await wait(450)
await page.evaluate(() => { window.__pad.axes[0] = 0 })
await wait(450)
await padPress(0) // "B"
const typed = await page.inputValue('#lr-nome')
check('teclado na tela digita o nome com o controle', typed === 'AB', `digitado: "${typed}"`)
await padPress(9) // Menu = próximo
check('Menu passa para o WhatsApp com teclado numérico', /SALVAR/.test(await text()) && /\b0\b/.test(await text()))
await padPress(0) // "1"
check('teclado numérico digita', (await page.inputValue('#lr-whats')) === '(1')
await page.screenshot({ path: `${out}/15-cadastro-controle.png` })
await padPress(9)
check('WhatsApp incompleto pelo controle é recusado', /Digite o DDD/.test(await text()))
await padPress(1) // B apaga
await padPress(1) // B vazio: volta ao nome
check('B apaga e volta ao campo do nome', (await page.inputValue('#lr-whats')) === '' && /PRÓXIMO/.test(await text()))

await page.setViewportSize({ width: 820, height: 1180 })
await wait(1500)
await page.screenshot({ path: `${out}/16-tablet.png` })

check('sem erros de JavaScript', errors.length === 0, errors.slice(0, 3).join(' / '))
console.log(results.join('\n'))
console.log(`${results.filter((r) => r.startsWith('PASSOU')).length} de ${results.length} passaram`)
await browser.close()
