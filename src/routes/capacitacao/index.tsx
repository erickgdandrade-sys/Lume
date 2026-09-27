import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Lock, Play, Star } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { modulos, tomSolid } from "@/lib/lume-data";
import heroImg from "@/assets/capacitacao-hero.svg";

export const Route = createFileRoute("/capacitacao/")({
  head: () => ({
    meta: [
      { title: "Capacitação do professor | Lume" },
      {
        name: "description",
        content:
          "Trilhas curtas e gamificadas sobre educação inclusiva, TEA, TDAH e comunicação na sala de aula.",
      },
      { property: "og:title", content: "Capacitação do professor | Lume" },
      {
        property: "og:description",
        content: "Aprenda estratégias inclusivas em poucos minutos por dia.",
      },
    ],
  }),
  component: Capacitacao,
});

function Capacitacao() {
  const totalAulas = modulos.reduce((s, m) => s + m.aulas, 0);
  const feitas = modulos.reduce((s, m) => s + m.concluidas, 0);
  const pct = Math.round((feitas / totalAulas) * 100);

  return (
    <div>
      <PageHeader
        title="Capacitação do professor"
        subtitle="Trilhas curtas, práticas e aplicáveis na próxima aula."
      />

      <div className="card-soft mb-6 p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-display text-sm font-bold">Nível 4 · Professora inclusiva</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {feitas} de {totalAulas} aulas concluídas · {pct}%
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-xs font-semibold">
            <Star className="h-3.5 w-3.5" /> 1.240 XP
          </span>
        </div>
        <Progress value={pct} className="mt-4 h-2.5" aria-label="Progresso geral" />
      </div>

      <div className="card-soft mb-8 overflow-hidden">
        <img
          src={heroImg}
          alt="Ilustração de uma professora conduzindo uma atividade inclusiva com a turma"
          className="h-52 w-full object-cover sm:h-64"
        />
        <div className="p-5">
          <p className="font-display text-lg font-extrabold">Neurodiversidade na sala de aula</p>
          <p className="mt-1 text-sm text-muted-foreground">Entenda, acolha, inclua.</p>
          <Link
            to="/capacitacao/flashcards"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" /> Começar agora
          </Link>
        </div>
      </div>

      <h2 className="mb-4 font-display text-xl font-extrabold">Meus cursos</h2>
      <div className="space-y-3">
        {modulos.map((m) => {
          const bloqueado = m.estado === "bloqueado";
          const concluido = m.estado === "concluido";
          return (
            <Link
              key={m.id}
              to="/capacitacao/flashcards"
              disabled={bloqueado}
              aria-disabled={bloqueado}
              className={`card-soft block p-4 transition-transform ${
                bloqueado ? "pointer-events-none opacity-60" : "hover:-translate-y-0.5"
              }`}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tomSolid[m.cor]} font-display text-sm font-extrabold text-card`}
                >
                  {concluido ? (
                    <Check className="h-5 w-5" />
                  ) : bloqueado ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    m.concluidas
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm font-bold">{m.titulo}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {m.concluidas}/{m.aulas} aulas
                  </span>
                  <Progress value={(m.concluidas / m.aulas) * 100} className="mt-2 h-1.5" />
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">
                  {concluido ? "Revisar" : bloqueado ? "Bloqueado" : "Continuar"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-extrabold">Conteúdos rápidos</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { t: "Dicas práticas para o dia a dia", d: "Pequenas ações, grandes impactos." },
          { t: "Como falar com as famílias", d: "Roteiro de conversa em 4 passos." },
        ].map((c) => (
          <div key={c.t} className="rounded-3xl bg-sky-soft p-5">
            <p className="font-display text-sm font-bold">{c.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
