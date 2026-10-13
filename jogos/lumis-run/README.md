# Lumis Run 3D

Jogo 3D no navegador da Lume para o stand do South Tech Summit: a Lumis corre pelo corredor da escola, desvia de obstáculos e coleta livros.

**Jogar:** https://erickgdandrade-sys.github.io/Lume/lumis-run/

## O que tem
- Corrida em três faixas com pulo e deslize, obstáculos escolares, livros para coletar e dificuldade progressiva.
- Teclado, toque e controle Xbox (Gamepad API).
- Música e efeitos sonoros gerados pelo próprio jogo (Web Audio), e animações da Lumis (tchau na largada e ao passar de nível).
- Dois rankings (mais pontos e mais livros), **online e iguais em todos os aparelhos**. Nome, WhatsApp e foto opcional são pedidos no fim da partida. O WhatsApp nunca aparece no ranking público.
- Tela final com QR code para uma página com a arte dos stories (1080×1920), com uma das imagens oficiais da Lumis sorteada e botão "Postar no Instagram".
- Área da equipe (senha do servidor), com contatos, fotos, partidas em análise e planilha CSV para entregar os prêmios.

## Ranking online
O ranking fica no **Supabase** (projeto em `online.json`), atrás da Edge Function `lumis-run` (`../../supabase/functions/lumis-run`). O navegador não grava nada direto no banco:

1. Antes da partida, o jogo pede ao servidor um **bilhete** com a semente da pista (guarda 2 de reserva para continuar funcionando se a internet cair).
2. O jogo registra os comandos do jogador (passo da simulação + comando).
3. No cadastro, o servidor **reexecuta a partida** com a mesma simulação (`core/replay.ts`) e calcula a pontuação. Se o número enviado pelo navegador for diferente, a partida é recusada. O bilhete vale uma vez só, e o tempo real entre o bilhete e o envio precisa cobrir a duração da partida.
4. Sem internet na hora de salvar, a partida fica numa fila no aparelho e é enviada quando a conexão voltar. Partidas jogadas sem bilhete (o aparelho estava sem internet desde que abriu o jogo) ficam **em análise** até a equipe aprovar.

Dados: o nome e a foto (com autorização) aparecem no ranking público. O WhatsApp fica numa tabela privada e só sai pela área da equipe, com a senha `LUMIS_EQUIPE_SENHA`, guardada como segredo no Supabase. As tabelas têm RLS sem políticas, e só a função de servidor (service_role) acessa.

**Limite conhecido:** a reexecução impede pontuação inventada, mas não impede um robô que jogue de verdade, em tempo real, com um bilhete válido.

Sem `online.json` configurado (ou abrindo o HTML único do disco), o jogo funciona no **modo local**: ranking e contatos no navegador da máquina, área da equipe com PIN.

Publicação: o workflow `.github/workflows/supabase.yml` aplica as migrations (`supabase/migrations`) e publica a função a cada mudança na `main`. Passo a passo da configuração: `ranking-online-como-configurar.md` (pasta do projeto).

## Comandos
```
npm install
npm run dev          # desenvolvimento
npm test             # testes (Vitest)
npm run build:site   # gera o servidor (handler.js) e o jogo em ../../public/lumis-run (GitHub Pages)
npm run build:server # só o servidor: ../../supabase/functions/lumis-run/handler.js (não edite à mão)
npm run server:local # ranking online local com banco em memória, em http://localhost:8787
npx vite build --mode preview-artifact   # HTML único autocontido (dist-artifact/), para abrir sem internet
node scripts/e2e.mjs <pasta>             # teste ponta a ponta no Chromium (precisa de `npm run preview`)
VITE_LUMIS_API=http://localhost:8787 npx vite build --outDir dist-online && npx vite preview --outDir dist-online --port 4174
node scripts/e2e-online.mjs <pasta>      # dois aparelhos no ranking online (precisa do server:local)
python3 scripts/recortar-poses.py <pasta-das-imagens-oficiais> src/assets/poses   # recorta as poses da Lumis
```

## Estrutura
```
src/features/lumis-run/
  config/   parâmetros do jogo, cores da marca e curva de dificuldade
  core/     simulação determinística (passo fixo de 120 Hz), gerador de pista, obstáculos e pontuação
  input/    teclado, toque e controle Xbox unificados
  audio/    música e efeitos (Web Audio)
  ranking/  rankings (online e local), nomes, WhatsApp e fotos
  share/    arte dos stories, QR code e página aberta pelo QR
  render/   cena 3D (Lumis, corredor, obstáculos, livros, câmera, luzes e sombras)
  ui/       telas e HUD
server/     servidor do ranking online (lógica pura, testada com banco em memória)
tests/      testes automáticos (incluindo a migration num Postgres em memória)
scripts/    testes ponta a ponta, servidor local, capturas e recorte das poses
```
