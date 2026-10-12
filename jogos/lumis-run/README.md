# Lumis Run 3D

Jogo 3D no navegador da Lume para o stand do South Tech Summit: a Lumis corre pelo corredor da escola, desvia de obstáculos e coleta livros.

**Jogar:** https://erickgdandrade-sys.github.io/Lume/lumis-run/

## O que tem
- Corrida em três faixas com pulo e deslize, obstáculos escolares, livros para coletar e dificuldade progressiva.
- Teclado, toque e controle Xbox (Gamepad API).
- Música e efeitos sonoros gerados pelo próprio jogo (Web Audio), e animações da Lumis (tchau na largada e ao passar de nível).
- Dois rankings (mais pontos e mais livros). Nome, WhatsApp e foto opcional são pedidos no fim da partida. O WhatsApp nunca aparece no ranking público.
- Tela final com QR code para uma página com a arte dos stories (1080×1920), com botão de compartilhar.
- Área da equipe (PIN), com contatos, fotos e planilha CSV para entregar os prêmios.

## Onde ficam os dados
O ranking, os contatos e as fotos ficam **no navegador da máquina do stand** (localStorage e IndexedDB). Nada vai para servidor. Antes do evento, troque o PIN padrão na área da equipe. Depois do evento, use "Apagar ranking, contatos e fotos".

## Comandos
```
npm install
npm run dev          # desenvolvimento
npm test             # testes (Vitest)
npm run build:site   # gera o jogo em ../../public/lumis-run (publicado com o site no GitHub Pages)
npx vite build --mode preview-artifact   # HTML único autocontido (dist-artifact/), para abrir sem internet
node scripts/e2e.mjs <pasta>             # teste ponta a ponta no Chromium (precisa de `npm run preview`)
```

## Estrutura
```
src/features/lumis-run/
  config/   parâmetros do jogo, cores da marca e curva de dificuldade
  core/     simulação determinística (passo fixo de 120 Hz), gerador de pista, obstáculos e pontuação
  input/    teclado, toque e controle Xbox unificados
  audio/    música e efeitos (Web Audio)
  ranking/  rankings, nomes, WhatsApp e fotos
  share/    arte dos stories, QR code e página aberta pelo QR
  render/   cena 3D (Lumis, corredor, obstáculos, livros, câmera, luzes e sombras)
  ui/       telas e HUD
tests/      testes automáticos
scripts/    teste ponta a ponta e capturas
```
