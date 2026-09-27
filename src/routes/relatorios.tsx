import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileText, GraduationCap, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { ParticipacaoChart } from "@/components/ParticipacaoChart";
import { Progress } from "@/components/ui/progress";
import { MESES, useAlunos } from "@/lib/alunos-store";
import { modulos, suporteTom } from "@/lib/lume-data";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios | Lume" },
      {
        name: "description",
        content:
          "Acompanhe a participação da turma, a evolução de cada aluno e o seu progresso na capacitação.",
      },
      { property: "og:title", content: "Relatórios | Lume" },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const alunos = useAlunos();
  const comRegistro = new Set(alunos.flatMap((a) => a.evolucao.map((e) => e.mes)));
  const meses = MESES.filter((m) => comRegistro.has(m));
  const mediaPorMes = meses.map((mes) => {
    const valores = alunos.flatMap((a) =>
      a.evolucao.filter((e) => e.mes === mes).map((e) => e.participacao),
    );
    return {
      rotulo: mes,
      valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
    };
  });
  const atual = mediaPorMes[mediaPorMes.length - 1]?.valor ?? 0;
  const inicial = mediaPorMes[0]?.valor ?? 0;

  const totalAulas = modulos.reduce((s, m) => s + m.aulas, 0);
  const feitas = modulos.reduce((s, m) => s + m.concluidas, 0);

  const kpis = [
    {
      icon: Users,
      tone: "bg-sky-soft",
      valor: String(alunos.length),
      rotulo: "Alunos acompanhados",
    },
    {
      icon: TrendingUp,
      tone: "bg-leaf-soft",
      valor: `${atual}%`,
      rotulo: `Participação média (+${atual - inicial} pts desde ${meses[0] ?? ""})`,
    },
    { icon: FileText, tone: "bg-sun-soft", valor: "12", rotulo: "Aulas adaptadas com IA" },
    {
      icon: GraduationCap,
      tone: "bg-tangerine-soft",
      valor: `${feitas}/${totalAulas}`,
      rotulo: "Aulas de capacitação concluídas",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Como sua turma está evoluindo com as estratégias inclusivas."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.rotulo} className="card-soft p-5">
            <span className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${k.tone}`}>
              <k.icon className="h-4 w-4" />
            </span>
            <p className="font-display text-2xl font-extrabold">{k.valor}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.rotulo}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card-soft p-5">
          <h2 className="font-display text-base font-extrabold">Participação média da turma</h2>
          <p className="mb-6 mt-0.5 text-xs text-muted-foreground">
            % de atividades com participação ativa, média dos alunos acompanhados
          </p>
          {mediaPorMes.length > 0 ? (
            <ParticipacaoChart titulo="Participação média da turma" dados={mediaPorMes} />
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              Ainda não há registros de participação. Registre no perfil de cada aluno.
            </p>
          )}
        </section>

        <section className="card-soft p-5">
          <h2 className="font-display text-base font-extrabold">Minha capacitação</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">Aulas concluídas por trilha</p>
          <div className="space-y-4">
            {modulos.map((m) => (
              <div key={m.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{m.titulo}</span>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {m.concluidas}/{m.aulas}
                  </span>
                </div>
                <Progress value={(m.concluidas / m.aulas) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card-soft overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <h2 className="font-display text-base font-extrabold">Evolução por aluno</h2>
          <Link
            to="/biblioteca"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <BookOpen className="h-3.5 w-3.5" /> Ver estratégias
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/60 text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Aluno</th>
                <th className="px-5 py-2.5 font-semibold">Suporte</th>
                {meses.map((m) => (
                  <th key={m} className="px-3 py-2.5 text-right font-semibold">
                    {m}
                  </th>
                ))}
                <th className="px-5 py-2.5 text-right font-semibold">Variação</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => {
                const ini = a.evolucao[0]?.participacao;
                const fim = a.evolucao[a.evolucao.length - 1]?.participacao;
                const variacao =
                  ini !== undefined && fim !== undefined && a.evolucao.length > 1
                    ? `${fim - ini >= 0 ? "+" : ""}${fim - ini} pts`
                    : "—";
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <Link
                        to="/alunos/$id"
                        params={{ id: a.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {a.nome}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{a.serie}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full ${suporteTom[a.suporte]} px-2.5 py-1 text-xs font-semibold`}
                      >
                        {a.suporte}
                      </span>
                    </td>
                    {meses.map((m) => {
                      const reg = a.evolucao.find((e) => e.mes === m);
                      return (
                        <td key={m} className="px-3 py-3 text-right tabular-nums">
                          {reg ? `${reg.participacao}%` : "—"}
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{variacao}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
