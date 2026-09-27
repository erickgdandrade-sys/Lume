import { z } from "zod/v4";

export const PlanoAdaptadoSchema = z.object({
  titulo: z.string().describe("Título curto, ex.: 'Plano de aula – Matemática'"),
  disciplina: z.string(),
  serie: z.string().describe("Série/ano, ou 'Não informado'"),
  duracao: z.string().describe("Duração estimada, ex.: '50 minutos'"),
  objetivo: z.string(),
  estrategias: z.array(z.string()).describe("Estratégias inclusivas para a turma toda"),
  etapas: z
    .array(z.object({ titulo: z.string(), descricao: z.string() }))
    .describe("Sequência da aula já adaptada, com tempo no título"),
  adaptacoes: z
    .array(
      z.object({
        aluno: z.string().describe("Rótulo recebido (ex.: 'Aluno 1') ou vazio se for por perfil"),
        perfil: z.string().describe("Ex.: 'TEA', 'TDAH e dislexia'"),
        itens: z.array(z.string()),
      }),
    )
    .describe("Adaptações específicas por aluno ou perfil"),
  barreiras: z.array(z.string()),
  recomendacoes: z.array(z.string()),
  recursos: z.array(z.string()).describe("Materiais e recursos complementares"),
});

export type PlanoAdaptado = z.infer<typeof PlanoAdaptadoSchema>;

export const PerfilAnonimoSchema = z.object({
  rotulo: z.string().max(20),
  serie: z.string().max(40),
  suporte: z.string().max(10),
  tags: z.array(z.string().max(60)).max(20),
  funcionam: z.array(z.string().max(300)).max(20),
  naoFuncionam: z.array(z.string().max(300)).max(20),
  sensorial: z.array(z.string().max(300)).max(20),
});

export type PerfilAnonimo = z.infer<typeof PerfilAnonimoSchema>;

export const AdaptarAulaInputSchema = z.object({
  plano: z.string().trim().min(15).max(20000),
  alunos: z.array(PerfilAnonimoSchema).max(60),
});

export type AdaptarAulaResposta = { ok: true; plano: PlanoAdaptado } | { ok: false; erro: string };

export const planoExemplo: PlanoAdaptado = {
  titulo: "Plano de aula – Matemática",
  disciplina: "Matemática",
  serie: "4º ano",
  duracao: "50 minutos",
  objetivo:
    "Compreender e aplicar os conceitos de adição e subtração em situações do cotidiano, garantindo que todos os alunos possam participar com o apoio de que precisam.",
  estrategias: [
    "Instruções em etapas",
    "Recursos visuais",
    "Participação em duplas",
    "Demonstrações práticas",
  ],
  etapas: [
    {
      titulo: "Abertura (10 min)",
      descricao: "Situação do cotidiano apresentada com imagens e objetos concretos.",
    },
    {
      titulo: "Prática em duplas (25 min)",
      descricao: "Problemas curtos com checklist visual e papéis definidos.",
    },
    {
      titulo: "Fechamento (15 min)",
      descricao: "Correção coletiva sem exposição, com opção de responder por desenho.",
    },
  ],
  adaptacoes: [
    {
      aluno: "",
      perfil: "Aluno com TEA",
      itens: [
        "Instruções visuais e passo a passo.",
        "Tempo extra para realização das atividades.",
        "Ambiente mais tranquilo durante a tarefa.",
      ],
    },
    {
      aluno: "",
      perfil: "Aluno com TDAH",
      itens: [
        "Atividades curtas e objetivas.",
        "Uso de recursos visuais e gamificação.",
        "Pausas programadas a cada 10 minutos.",
      ],
    },
    {
      aluno: "",
      perfil: "Aluno com dislexia",
      itens: [
        "Material com fonte ampliada e espaçamento maior.",
        "Leitura em voz alta como opção, nunca obrigatória.",
        "Uso de recursos visuais e materiais concretos.",
      ],
    },
  ],
  barreiras: [
    "Enunciado longo e apenas escrito.",
    "Ruído durante o trabalho em grupo.",
    "Correção exposta na frente da turma.",
  ],
  recomendacoes: [
    "Combine os papéis do grupo antes de começar.",
    "Ofereça a mesma tarefa em versão visual.",
    "Avise 5 minutos antes de mudar de atividade.",
  ],
  recursos: [
    "Cartões de rotina visual para imprimir.",
    "Jogo dos números: atividade lúdica com apoio visual.",
    "Checklist da tarefa em duas versões de leitura.",
  ],
};

export const planoOriginalExemplo = `Aula de Matemática – 4º ano (50 min)
Objetivo: compreender os conceitos de adição e subtração.
1. Abertura (10 min): explicação oral sobre adição e subtração.
2. Exercícios (25 min): lista de 10 problemas no caderno, individualmente.
3. Correção (15 min): alunos resolvem no quadro na frente da turma.`;
