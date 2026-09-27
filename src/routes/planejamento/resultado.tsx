import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Lightbulb,
  Link2,
  ListOrdered,
  Printer,
  Sparkles,
  Target,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { planoExemplo, planoOriginalExemplo } from "@/lib/plano-schema";
import { planosStore } from "@/lib/planos-store";

type Busca = { id?: string };

export const Route = createFileRoute("/planejamento/resultado")({
  validateSearch: (search: Record<string, unknown>): Busca =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  head: () => ({
    meta: [
      { title: "Resultado da adaptação com IA | Lume" },
      {
        name: "description",
        content:
          "Veja o plano de aula adaptado: objetivos, estratégias inclusivas, barreiras possíveis e recursos complementares.",
      },
    ],
  }),
  component: Resultado,
});

const tonsAdaptacao = [
  "bg-leaf-soft",
  "bg-coral-soft",
  "bg-sky-soft",
  "bg-lilac-soft",
  "bg-sun-soft",
];

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
      {itens.map((i) => (
        <li key={i}>• {i}</li>
      ))}
    </ul>
  );
}

function Resultado() {
  const { id } = Route.useSearch();
  const planos = planosStore.use();
  const salvo = id ? planos.find((p) => p.id === id) : undefined;

  if (id && !salvo) {
    return (
      <div className="card-soft mx-auto max-w-md p-10 text-center">
        <p className="font-display text-lg font-extrabold">Plano não encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">Ele pode ter sido excluído.</p>
        <Link
          to="/planejamento"
          className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao planejamento
        </Link>
      </div>
    );
  }

  const plano = salvo?.resultado ?? planoExemplo;
  const original = salvo?.original ?? planoOriginalExemplo;
  const nomes = salvo?.nomes ?? {};

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to="/planejamento"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">{plano.titulo}</h1>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Imprimir ou salvar em PDF"
          title="Imprimir ou salvar em PDF"
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-secondary px-3 py-1.5">{plano.serie}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
          <Clock className="h-3.5 w-3.5" /> {plano.duracao}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5">
          <Sparkles className="h-3.5 w-3.5" /> {salvo ? "Gerado com IA" : "Exemplo"}
        </span>
      </div>

      <Tabs defaultValue="ia">
        <TabsList className="mb-6 h-11 w-full rounded-full p-1">
          <TabsTrigger value="original" className="h-9 flex-1 rounded-full">
            Plano original
          </TabsTrigger>
          <TabsTrigger value="ia" className="h-9 flex-1 rounded-full">
            Com IA (inclusivo)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="original" className="mt-0">
          <section className="card-soft p-5">
            <h2 className="font-display text-base font-extrabold">Como você escreveu</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{original}</p>
          </section>
        </TabsContent>

        <TabsContent value="ia" className="mt-0">
          <section className="card-soft mb-4 p-5">
            <h2 className="inline-flex items-center gap-2 font-display text-base font-extrabold">
              <Target className="h-4 w-4" /> Objetivo da aula
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{plano.objetivo}</p>
          </section>

          <section className="mb-4">
            <h2 className="mb-3 font-display text-base font-extrabold">
              Estratégias inclusivas para a turma
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {plano.estrategias.map((e) => (
                <div key={e} className="card-soft px-4 py-3 text-sm font-medium">
                  {e}
                </div>
              ))}
            </div>
          </section>

          {plano.etapas.length > 0 ? (
            <section className="card-soft mb-4 p-5">
              <h2 className="inline-flex items-center gap-2 font-display text-base font-extrabold">
                <ListOrdered className="h-4 w-4" /> Passo a passo da aula
              </h2>
              <ol className="mt-3 space-y-3">
                {plano.etapas.map((e, i) => (
                  <li
                    key={`${e.titulo}-${i}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-extrabold">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{e.titulo}</span>
                      <span className="block text-sm text-muted-foreground">{e.descricao}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {plano.adaptacoes.length > 0 ? (
            <section className="mb-4">
              <h2 className="mb-3 font-display text-base font-extrabold">Participação inclusiva</h2>
              <div className="space-y-3">
                {plano.adaptacoes.map((a, i) => {
                  const nome = a.aluno ? nomes[a.aluno] : undefined;
                  return (
                    <div
                      key={`${a.aluno}-${a.perfil}-${i}`}
                      className={`rounded-3xl ${tonsAdaptacao[i % tonsAdaptacao.length]} p-4`}
                    >
                      <p className="font-display text-sm font-bold">
                        {nome ?? a.perfil}
                        {nome ? (
                          <span className="ml-1.5 font-sans text-xs font-semibold text-muted-foreground">
                            {a.perfil}
                          </span>
                        ) : null}
                      </p>
                      <Lista itens={a.itens} />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="card-soft p-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
                <AlertTriangle className="h-4 w-4" /> Possíveis barreiras
              </p>
              <Lista itens={plano.barreiras} />
            </div>
            <div className="card-soft p-5">
              <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
                <Lightbulb className="h-4 w-4" /> Recomendações
              </p>
              <Lista itens={plano.recomendacoes} />
            </div>
          </section>

          <section className="card-soft p-5">
            <p className="inline-flex items-center gap-2 font-display text-sm font-bold">
              <Link2 className="h-4 w-4" /> Recursos complementares
            </p>
            <Lista itens={plano.recursos} />
          </section>

          {salvo ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Sugestões geradas por IA. Revise antes de aplicar — você conhece sua turma melhor que
              ninguém.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
