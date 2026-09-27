import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { adaptarAula } from "@/lib/adaptar-aula";
import { useAlunos } from "@/lib/alunos-store";
import type { PerfilAnonimo } from "@/lib/plano-schema";
import { planosStore, removerPlano, salvarPlano } from "@/lib/planos-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planejamento/")({
  head: () => ({
    meta: [
      { title: "Planejamento inclusivo com IA | Lume" },
      {
        name: "description",
        content:
          "Cole seu plano de aula e receba adaptações inclusivas, recursos e estratégias para cada perfil de aluno.",
      },
      { property: "og:title", content: "Planejamento inclusivo com IA | Lume" },
      {
        property: "og:description",
        content: "Transforme qualquer plano de aula em uma experiência mais inclusiva.",
      },
    ],
  }),
  component: Planejamento,
});

const exemplos = [
  "Aula de matemática (4º ano, 50 min) sobre adição e subtração com situações do cotidiano. Explicação no quadro, lista de 10 exercícios individuais e correção no quadro.",
  "Roda de leitura em grupo (3º ano) com o livro 'Menina bonita do laço de fita', seguida de discussão oral e produção de um desenho.",
  "Experimento de ciências (5º ano) sobre estados físicos da água: gelo, água e vapor, com registro escrito no caderno.",
];

const coresPlano = ["bg-sky-soft", "bg-coral-soft", "bg-sun-soft", "bg-leaf-soft", "bg-lilac-soft"];

function Planejamento() {
  const navigate = useNavigate();
  const alunos = useAlunos();
  const planos = planosStore.use();
  const [texto, setTexto] = useState("");
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const turma = alunos.filter((a) => !excluidos.includes(a.id));
  const curto = texto.trim().length < 15;

  function alternarAluno(id: string) {
    setExcluidos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  async function enviar() {
    if (curto || carregando) return;
    setCarregando(true);
    setErro("");

    const nomes: Record<string, string> = {};
    const perfis: PerfilAnonimo[] = turma.map((a, i) => {
      const rotulo = `Aluno ${i + 1}`;
      nomes[rotulo] = a.nome;
      return {
        rotulo,
        serie: a.serie,
        suporte: a.suporte,
        tags: a.tags,
        funcionam: a.funcionam,
        naoFuncionam: a.naoFuncionam,
        sensorial: a.sensorial,
      };
    });

    try {
      const resposta = await adaptarAula({ data: { plano: texto.trim(), alunos: perfis } });
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }
      const salvo = salvarPlano({ original: texto.trim(), resultado: resposta.plano, nomes });
      navigate({ to: "/planejamento/resultado", search: { id: salvo.id } });
    } catch (e) {
      console.error(e);
      setErro(
        "Não foi possível falar com o servidor. Verifique se o app está rodando e tente de novo.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Planejamento de aula"
        subtitle="Cole seu planejamento e deixe a IA tornar sua aula mais inclusiva para a sua turma."
      />

      <form
        className="card-soft brand-halo p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <label htmlFor="plano" className="mb-2 block font-display text-sm font-bold">
          Seu plano de aula
        </label>
        <Textarea
          id="plano"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={carregando}
          placeholder="Cole aqui seu plano de aula: série, objetivo, etapas, materiais e avaliação..."
          className="min-h-44 resize-y rounded-2xl bg-card text-sm"
        />
        <div className="mt-2 flex justify-end text-xs text-muted-foreground">
          {texto.length} caracteres
        </div>

        {alunos.length > 0 ? (
          <fieldset className="mt-3">
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              Alunos desta turma ({turma.length} de {alunos.length}) — clique para incluir ou tirar
            </legend>
            <div className="flex flex-wrap gap-2">
              {alunos.map((a) => {
                const ativo = !excluidos.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={ativo}
                    disabled={carregando}
                    onClick={() => alternarAluno(a.id)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      ativo
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground line-through",
                    )}
                  >
                    {a.nome.split(" ")[0]}
                    {a.tags.length ? ` · ${a.tags.join(", ")}` : ""}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Os nomes dos alunos não são enviados à IA — só
              o perfil, de forma anônima.
            </p>
          </fieldset>
        ) : null}

        {erro ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={curto || carregando}
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {carregando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Adaptando sua aula… pode levar até 1
              minuto
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Adaptar aula com IA
            </>
          )}
        </button>

        <p className="mt-5 text-xs font-semibold text-muted-foreground">Exemplos de uso</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {exemplos.map((e) => (
            <button
              key={e}
              type="button"
              disabled={carregando}
              onClick={() => setTexto(e)}
              className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {e.length > 70 ? `${e.slice(0, 70)}…` : e}
            </button>
          ))}
        </div>
      </form>

      <h2 className="mb-4 mt-10 font-display text-xl font-extrabold">Meus planejamentos</h2>
      {planos.length === 0 ? (
        <div className="card-soft p-6 text-center">
          <p className="text-sm text-muted-foreground">Seus planos adaptados vão aparecer aqui.</p>
          <Link
            to="/planejamento/resultado"
            className="mt-3 inline-flex text-sm font-semibold text-primary"
          >
            Ver um exemplo de plano adaptado →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {planos.map((p, i) => (
            <div key={p.id} className="card-soft flex items-center gap-2 p-2 pr-3">
              <Link
                to="/planejamento/resultado"
                search={{ id: p.id }}
                className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-secondary/60"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${coresPlano[i % coresPlano.length]}`}
                >
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold">
                    {p.resultado.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {p.resultado.serie} ·{" "}
                    {new Date(p.criadoEm).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => removerPlano(p.id)}
                aria-label={`Excluir ${p.resultado.titulo}`}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-coral-soft hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
