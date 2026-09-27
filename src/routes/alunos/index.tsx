import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search, TrendingUp, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { AlunoFormDialog } from "@/components/AlunoFormDialog";
import { Input } from "@/components/ui/input";
import { useAlunos } from "@/lib/alunos-store";
import { suporteTom } from "@/lib/lume-data";
import { cn, iniciais } from "@/lib/utils";

export const Route = createFileRoute("/alunos/")({
  head: () => ({
    meta: [
      { title: "Perfis dos alunos | Lume" },
      {
        name: "description",
        content:
          "Conheça as necessidades, preferências e estratégias que funcionam para cada estudante.",
      },
      { property: "og:title", content: "Perfis dos alunos | Lume" },
      {
        property: "og:description",
        content: "Necessidades e estratégias de cada estudante em um só lugar.",
      },
    ],
  }),
  component: Alunos,
});

const avatarTons = ["bg-sky-soft", "bg-lilac-soft", "bg-tangerine-soft", "bg-leaf-soft"];

function Alunos() {
  const alunos = useAlunos();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");

  const filtros = ["Todos", ...Array.from(new Set(alunos.flatMap((a) => a.tags))).slice(0, 6)];

  const lista = alunos.filter(
    (a) =>
      (filtro === "Todos" || a.tags.includes(filtro)) &&
      a.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  const botaoCadastrar = (
    <AlunoFormDialog
      onSalvo={(novo) => navigate({ to: "/alunos/$id", params: { id: novo.id } })}
      trigger={
        <button
          type="button"
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Cadastrar aluno</span>
          <span className="sm:hidden">Novo</span>
        </button>
      }
    />
  );

  return (
    <div>
      <PageHeader
        title="Perfis dos alunos"
        subtitle={`${alunos.length} ${alunos.length === 1 ? "aluno acompanhado" : "alunos acompanhados"} · necessidades, preferências e o que funciona.`}
        action={botaoCadastrar}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno pelo nome"
            aria-label="Buscar aluno"
            className="h-12 rounded-full bg-card pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por perfil">
          {filtros.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                filtro === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {lista.map((a, i) => {
          const primeira = a.evolucao[0]?.participacao;
          const ultima = a.evolucao[a.evolucao.length - 1]?.participacao;
          return (
            <Link
              key={a.id}
              to="/alunos/$id"
              params={{ id: a.id }}
              className="card-soft group block p-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                <span
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${avatarTons[i % avatarTons.length]} font-display text-sm font-extrabold`}
                >
                  {iniciais(a.nome)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-extrabold">
                    {a.nome}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {a.serie} · {a.idade} anos · atualizado em {a.atualizado}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {a.resumo || "Perfil recém-cadastrado — complete as informações do aluno."}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full ${suporteTom[a.suporte]} px-3 py-1 text-xs font-semibold`}
                >
                  Suporte {a.suporte.toLowerCase()}
                </span>
                {a.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold"
                  >
                    {t}
                  </span>
                ))}
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {ultima === undefined
                    ? "Sem registros de participação"
                    : primeira !== undefined && a.evolucao.length > 1
                      ? `${ultima}% participação (${ultima - primeira >= 0 ? "+" : ""}${ultima - primeira})`
                      : `${ultima}% participação`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <div className="card-soft mt-2 p-10 text-center">
          <p className="font-display text-base font-bold">
            {alunos.length === 0 ? "Nenhum aluno cadastrado ainda" : "Nenhum aluno encontrado"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {alunos.length === 0
              ? "Cadastre o primeiro aluno para começar a acompanhar as estratégias."
              : "Tente outro nome ou filtro."}
          </p>
          {alunos.length === 0 ? <div className="mt-5">{botaoCadastrar}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
