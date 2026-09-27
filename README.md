# Lume — Mais inclusão, menos barreiras

Plataforma de educação inclusiva para professores: capacitação prática, planejamento de aula
com IA, perfis dos alunos, biblioteca de estratégias e relatórios.

## Desenvolvimento

Você precisa de Node.js (20.19+ ou 22.12+) e npm — ou [Bun](https://bun.sh).

```sh
npm i        # ou: bun install
npm run dev  # ou: bun dev
```

## Páginas

| Rota | Conteúdo |
| --- | --- |
| `/` | Painel inicial |
| `/capacitacao` | Trilhas e progresso |
| `/capacitacao/flashcards` | Flashcards com XP |
| `/planejamento` | Adaptar plano de aula com IA |
| `/planejamento/resultado` | Plano adaptado |
| `/alunos` | Lista de perfis |
| `/alunos/$id` | Perfil detalhado do aluno |
| `/biblioteca` | Biblioteca de estratégias |
| `/relatorios` | Relatórios da turma |

## Tecnologias

- TanStack Start
- TypeScript
- React
- Tailwind CSS
