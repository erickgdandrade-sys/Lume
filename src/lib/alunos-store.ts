import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { alunos as alunosExemplo, type Aluno } from "./lume-data";

const CHAVE = "lume:alunos:v1";

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export type AlunoDados = Omit<Aluno, "id" | "atualizado" | "evolucao" | "historico">;

let cache: Aluno[] | null = null;
const ouvintes = new Set<() => void>();

function ler(): Aluno[] {
  if (cache) return cache;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lista: unknown = bruto ? JSON.parse(bruto) : null;
    cache = Array.isArray(lista) ? (lista as Aluno[]) : alunosExemplo;
  } catch {
    cache = alunosExemplo;
  }
  return cache;
}

function salvar(lista: Aluno[]) {
  cache = lista;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {}
  ouvintes.forEach((o) => o());
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  const aoMudarStorage = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      cache = null;
      ouvinte();
    }
  };
  window.addEventListener("storage", aoMudarStorage);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

export function useAlunos(): Aluno[] {
  return useSyncExternalStore(inscrever, ler, () => alunosExemplo);
}

export function useAluno(id: string): Aluno | undefined {
  return useAlunos().find((a) => a.id === id);
}

function hoje() {
  return format(new Date(), "dd 'de' MMMM", { locale: ptBR });
}

function slug(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "aluno"
  );
}

export function adicionarAluno(dados: AlunoDados): Aluno {
  const lista = ler();
  const base = slug(dados.nome);
  let id = base;
  for (let n = 2; lista.some((a) => a.id === id); n++) id = `${base}-${n}`;

  const aluno: Aluno = { ...dados, id, atualizado: hoje(), evolucao: [], historico: [] };
  salvar([aluno, ...lista]);
  return aluno;
}

export function atualizarAluno(id: string, dados: AlunoDados) {
  salvar(ler().map((a) => (a.id === id ? { ...a, ...dados, atualizado: hoje() } : a)));
}

export function removerAluno(id: string) {
  salvar(ler().filter((a) => a.id !== id));
}

export function registrarParticipacao(id: string, mes: string, participacao: number) {
  const ordem = (m: string) => MESES.indexOf(m as (typeof MESES)[number]);
  salvar(
    ler().map((a) => {
      if (a.id !== id) return a;
      const evolucao = [...a.evolucao.filter((e) => e.mes !== mes), { mes, participacao }].sort(
        (x, y) => ordem(x.mes) - ordem(y.mes),
      );
      return { ...a, evolucao, atualizado: hoje() };
    }),
  );
}

export function adicionarNota(id: string, titulo: string, texto: string) {
  salvar(
    ler().map((a) =>
      a.id === id
        ? { ...a, historico: [...a.historico, { titulo, texto }], atualizado: hoje() }
        : a,
    ),
  );
}
