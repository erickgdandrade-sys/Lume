export type Tom = "coral" | "tangerine" | "sun" | "leaf" | "sky" | "lilac";

export type Aluno = {
  id: string;
  nome: string;
  serie: string;
  idade: number;
  atualizado: string;
  suporte: "Alto" | "Médio" | "Leve";
  tags: string[];
  resumo: string;
  caracteristicas: string[];
  preferencias: string[];
  sensorial: string[];
  funcionam: string[];
  naoFuncionam: string[];
  historico: { titulo: string; texto: string }[];
  familia: string;
  evolucao: { mes: string; participacao: number }[];
};

export const alunos: Aluno[] = [
  {
    id: "lucas-almeida",
    nome: "Lucas Almeida",
    serie: "4º ano",
    idade: 9,
    atualizado: "12 de maio",
    suporte: "Médio",
    tags: ["TEA", "TDAH", "Dislexia"],
    resumo: "Lucas responde melhor a instruções visuais e se beneficia de ambientes previsíveis.",
    caracteristicas: [
      "Comunicativo, mas com dificuldade em interações de grupo.",
      "Prefere rotinas e se sente inseguro com mudanças.",
      "Tem grande interesse por tecnologia e dinossauros.",
    ],
    preferencias: [
      "Trabalhar em duplas com colega de confiança.",
      "Atividades com apoio de imagens e vídeos curtos.",
      "Registrar respostas por desenho ou áudio.",
    ],
    sensorial: [
      "Incomoda-se com ruídos altos e repentinos.",
      "Prefere luz natural a lâmpadas fortes.",
      "Usa fone abafador em momentos de sobrecarga.",
    ],
    funcionam: [
      "Instruções em etapas curtas e numeradas.",
      "Aviso antecipado de mudanças na rotina.",
      "Reforço positivo imediato após a tarefa.",
    ],
    naoFuncionam: [
      "Pedidos verbais longos sem apoio visual.",
      "Exposição para responder em voz alta sem preparo.",
      "Retirar o intervalo como punição.",
    ],
    historico: [
      {
        titulo: "Desempenho acadêmico",
        texto: "Evolução constante em matemática e ciências. Dificuldade em leitura e escrita.",
      },
      {
        titulo: "Comportamento",
        texto: "Pode se distrair facilmente. Reage bem a reforços positivos.",
      },
      {
        titulo: "Notas importantes",
        texto: "Já apresentou crises de ansiedade em momentos de sobrecarga.",
      },
    ],
    familia:
      "A família relata que Lucas dorme melhor com rotina fixa e que atividades com imagens ajudam na lição de casa.",
    evolucao: [
      { mes: "Fev", participacao: 42 },
      { mes: "Mar", participacao: 51 },
      { mes: "Abr", participacao: 63 },
      { mes: "Mai", participacao: 74 },
    ],
  },
  {
    id: "marina-souza",
    nome: "Marina Souza",
    serie: "3º ano",
    idade: 8,
    atualizado: "08 de maio",
    suporte: "Leve",
    tags: ["TDAH"],
    resumo: "Marina se engaja mais quando a aula alterna explicação curta e prática.",
    caracteristicas: [
      "Muito criativa e participativa nas rodas de conversa.",
      "Perde o foco em tarefas longas.",
      "Gosta de assumir papéis de liderança.",
    ],
    preferencias: ["Tarefas com tempo marcado", "Movimento entre atividades", "Trabalho em grupo"],
    sensorial: ["Tolera bem ruído moderado", "Prefere sentar perto da janela"],
    funcionam: ["Blocos de 10 minutos", "Checklists visíveis", "Papel definido no grupo"],
    naoFuncionam: ["Cópia longa da lousa", "Instruções acumuladas de uma só vez"],
    historico: [
      { titulo: "Desempenho acadêmico", texto: "Boa oralidade, escrita em desenvolvimento." },
      { titulo: "Comportamento", texto: "Colabora bem quando tem uma função clara." },
    ],
    familia: "A família apoia o uso de timers em casa e relata melhora na organização.",
    evolucao: [
      { mes: "Fev", participacao: 55 },
      { mes: "Mar", participacao: 60 },
      { mes: "Abr", participacao: 68 },
      { mes: "Mai", participacao: 79 },
    ],
  },
  {
    id: "pedro-lima",
    nome: "Pedro Lima",
    serie: "5º ano",
    idade: 10,
    atualizado: "02 de maio",
    suporte: "Alto",
    tags: ["TEA", "Comunicação alternativa"],
    resumo: "Pedro comunica-se melhor com apoio de pranchas visuais e tempo extra de resposta.",
    caracteristicas: [
      "Comunicação verbal reduzida em grupos grandes.",
      "Demonstra interesse intenso por mapas.",
      "Responde bem a rotinas visuais na parede.",
    ],
    preferencias: ["Ambiente silencioso", "Trabalho individual antes do coletivo"],
    sensorial: ["Sensível a luzes piscantes", "Busca objetos de pressão para se regular"],
    funcionam: ["Prancha de comunicação", "Tempo extra para responder", "Antecipação da rotina"],
    naoFuncionam: ["Mudança repentina de sala", "Perguntas rápidas em sequência"],
    historico: [
      { titulo: "Desempenho acadêmico", texto: "Excelente memória visual e raciocínio espacial." },
      { titulo: "Comportamento", texto: "Momentos de sobrecarga em dias de evento escolar." },
    ],
    familia: "A família usa a mesma prancha de comunicação em casa.",
    evolucao: [
      { mes: "Fev", participacao: 30 },
      { mes: "Mar", participacao: 38 },
      { mes: "Abr", participacao: 47 },
      { mes: "Mai", participacao: 58 },
    ],
  },
  {
    id: "beatriz-rocha",
    nome: "Beatriz Rocha",
    serie: "4º ano",
    idade: 9,
    atualizado: "28 de abril",
    suporte: "Leve",
    tags: ["Dislexia"],
    resumo: "Beatriz avança bem com fonte ampliada, leitura em voz alta e mais tempo.",
    caracteristicas: ["Ótima compreensão oral", "Insegurança ao ler em público"],
    preferencias: ["Material com fonte ampliada", "Leitura em dupla"],
    sensorial: ["Sem restrições relevantes"],
    funcionam: ["Espaçamento maior no texto", "Audiolivros", "Correção sem exposição"],
    naoFuncionam: ["Leitura em voz alta sem aviso", "Textos densos sem divisão"],
    historico: [{ titulo: "Desempenho acadêmico", texto: "Avanço consistente com adaptações." }],
    familia: "A família acompanha a leitura diária em casa por 15 minutos.",
    evolucao: [
      { mes: "Fev", participacao: 60 },
      { mes: "Mar", participacao: 66 },
      { mes: "Abr", participacao: 72 },
      { mes: "Mai", participacao: 81 },
    ],
  },
];

export type Modulo = {
  id: string;
  titulo: string;
  aulas: number;
  concluidas: number;
  cor: Tom;
  estado: "concluido" | "atual" | "disponivel" | "bloqueado";
};

export const modulos: Modulo[] = [
  {
    id: "introducao",
    titulo: "Introdução à Educação Inclusiva",
    aulas: 5,
    concluidas: 5,
    cor: "tangerine",
    estado: "concluido",
  },
  { id: "tea", titulo: "TEA na prática", aulas: 5, concluidas: 3, cor: "leaf", estado: "atual" },
  {
    id: "tdah",
    titulo: "TDAH na sala de aula",
    aulas: 5,
    concluidas: 2,
    cor: "sky",
    estado: "disponivel",
  },
  {
    id: "comunicacao",
    titulo: "Comunicação inclusiva",
    aulas: 4,
    concluidas: 0,
    cor: "lilac",
    estado: "bloqueado",
  },
  {
    id: "grupo",
    titulo: "Participação em grupo",
    aulas: 4,
    concluidas: 0,
    cor: "coral",
    estado: "bloqueado",
  },
];

export type Flashcard = {
  pergunta: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
};

export const flashcards: Flashcard[] = [
  {
    pergunta:
      "Um aluno apresenta dificuldade durante atividades em grupo. Qual estratégia pode ajudar?",
    alternativas: [
      "Retirar o aluno da atividade",
      "Aplicar punição",
      "Definir papéis claros para cada integrante",
      "Fazer a atividade individualmente",
    ],
    correta: 2,
    explicacao:
      "Definir papéis claros reduz a incerteza social, dá previsibilidade e permite que cada aluno contribua a partir das suas forças — sem excluir ninguém da atividade.",
  },
  {
    pergunta: "Como apoiar um aluno que se sobrecarrega com ruído durante a prova?",
    alternativas: [
      "Ignorar, pois todos fazem no mesmo ambiente",
      "Oferecer um espaço mais silencioso e fone abafador",
      "Reduzir a nota pelo tempo extra",
      "Deixar a prova para depois sem combinar",
    ],
    correta: 1,
    explicacao:
      "Ajustes sensoriais não dão vantagem: eles removem uma barreira para que o aluno mostre o que realmente sabe.",
  },
  {
    pergunta: "Qual é a melhor forma de dar uma instrução com várias etapas?",
    alternativas: [
      "Falar tudo de uma vez, rapidamente",
      "Escrever apenas na lousa em letra pequena",
      "Dividir em etapas curtas com apoio visual",
      "Pedir que um colega repita depois",
    ],
    correta: 2,
    explicacao:
      "Etapas curtas com apoio visual reduzem a carga de memória de trabalho e beneficiam a turma inteira.",
  },
];

export type Estrategia = {
  categoria: string;
  titulo: string;
  dica: string;
  cor: Tom;
};

export const estrategias: Estrategia[] = [
  {
    categoria: "Participação",
    titulo: "Papéis rotativos no grupo",
    dica: "Defina funções (relator, cronometrista, organizador) e revezem a cada atividade.",
    cor: "sky",
  },
  {
    categoria: "Participação",
    titulo: "Resposta em duplas",
    dica: "Antes de responder ao grupo, o aluno formula a resposta com um colega.",
    cor: "sky",
  },
  {
    categoria: "Comunicação",
    titulo: "Prancha de comunicação visual",
    dica: "Cartões com imagens para pedir ajuda, pausa ou banheiro sem exposição.",
    cor: "leaf",
  },
  {
    categoria: "Comunicação",
    titulo: "Instrução em 3 passos",
    dica: "Fale, escreva e mostre. Peça a confirmação com um gesto combinado.",
    cor: "leaf",
  },
  {
    categoria: "Organização",
    titulo: "Rotina visual na parede",
    dica: "Sequência da aula em cartões, com um marcador indicando o momento atual.",
    cor: "tangerine",
  },
  {
    categoria: "Organização",
    titulo: "Checklist da tarefa",
    dica: "Lista curta que o aluno marca conforme avança, dando sensação de progresso.",
    cor: "tangerine",
  },
  {
    categoria: "Regulação emocional",
    titulo: "Cantinho da calma",
    dica: "Espaço previsível na sala, com uso combinado antes da sobrecarga acontecer.",
    cor: "lilac",
  },
  {
    categoria: "Regulação emocional",
    titulo: "Aviso de transição",
    dica: "Sinalize 5 e 2 minutos antes de mudar de atividade.",
    cor: "lilac",
  },
  {
    categoria: "Adaptações pedagógicas",
    titulo: "Texto com fonte ampliada",
    dica: "Fonte 14-16, espaçamento 1,5 e parágrafos curtos facilitam a leitura.",
    cor: "coral",
  },
  {
    categoria: "Adaptações pedagógicas",
    titulo: "Múltiplas formas de resposta",
    dica: "Permita áudio, desenho ou esquema como alternativa ao texto escrito.",
    cor: "coral",
  },
];

export const tomSoft: Record<Tom, string> = {
  coral: "bg-coral-soft",
  tangerine: "bg-tangerine-soft",
  sun: "bg-sun-soft",
  leaf: "bg-leaf-soft",
  sky: "bg-sky-soft",
  lilac: "bg-lilac-soft",
};

export const suporteTom: Record<Aluno["suporte"], string> = {
  Alto: "bg-coral-soft",
  Médio: "bg-sun-soft",
  Leve: "bg-leaf-soft",
};

export const tomSolid: Record<Tom, string> = {
  coral: "bg-coral",
  tangerine: "bg-tangerine",
  sun: "bg-sun",
  leaf: "bg-leaf",
  sky: "bg-sky",
  lilac: "bg-lilac",
};
