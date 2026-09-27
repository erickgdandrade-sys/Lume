import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GraduationCap,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
  Flame,
  Trophy,
  Brain,
  UserRoundCheck,
  Route as Trilha,
} from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import symbol from "@/assets/lume-symbol.png";
import { usePerfil } from "@/lib/perfil-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início | Lume — educação inclusiva" },
      {
        name: "description",
        content:
          "Painel da professora: capacitação prática, planejamento de aula com IA, perfis dos alunos e biblioteca de estratégias inclusivas.",
      },
      { property: "og:title", content: "Início | Lume" },
      {
        property: "og:description",
        content: "Tudo o que você precisa para tornar sua próxima aula mais inclusiva.",
      },
    ],
  }),
  component: Dashboard,
});

const cards = [
  {
    to: "/capacitacao",
    icon: GraduationCap,
    tone: "bg-tangerine-soft",
    iconTone: "bg-tangerine",
    titulo: "Capacitação Prática",
    desc: "Aprenda estratégias inclusivas em poucos minutos.",
  },
  {
    to: "/planejamento",
    icon: Sparkles,
    tone: "bg-sky-soft",
    iconTone: "bg-sky",
    titulo: "Planejamento Inclusivo com IA",
    desc: "Transforme qualquer plano de aula em uma experiência mais inclusiva.",
  },
  {
    to: "/alunos",
    icon: Users,
    tone: "bg-leaf-soft",
    iconTone: "bg-leaf",
    titulo: "Perfis dos Alunos",
    desc: "Conheça as necessidades e estratégias de cada estudante.",
  },
  {
    to: "/biblioteca",
    icon: BookOpen,
    tone: "bg-lilac-soft",
    iconTone: "bg-lilac",
    titulo: "Biblioteca de Estratégias",
    desc: "Centenas de práticas validadas para diferentes contextos.",
  },
] as const;

const destaques = [
  {
    to: "/capacitacao",
    icon: Brain,
    tone: "bg-sky-soft",
    t: "Neurodiversidade na prática",
    d: "Aplique estratégias no dia a dia da sala.",
  },
  {
    to: "/alunos",
    icon: UserRoundCheck,
    tone: "bg-coral-soft",
    t: "3 alunos sem atualização",
    d: "Revise os perfis antes do conselho de classe.",
  },
  {
    to: "/capacitacao",
    icon: Trilha,
    tone: "bg-leaf-soft",
    t: "Nova trilha: TDAH",
    d: "5 aulas curtas com exemplos reais de sala.",
  },
] as const;

function Dashboard() {
  const perfil = usePerfil();

  return (
    <div>
      <div className="card-soft brand-halo mb-8 overflow-hidden p-6 sm:p-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              Olá, {perfil.nome} 👋
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Vamos tornar sua próxima aula mais inclusiva.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-xs font-semibold">
                <Flame className="h-3.5 w-3.5" /> 5 dias seguidos
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1.5 text-xs font-semibold">
                <Trophy className="h-3.5 w-3.5" /> Nível 4 · 1.240 XP
              </span>
            </div>
          </div>
          <img src={symbol} alt="" className="hidden h-24 w-24 shrink-0 sm:block" />
        </div>
      </div>

      <PageHeader
        title="Comece por aqui"
        subtitle="Quatro caminhos para uma sala mais acolhedora."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className={`group ${c.tone} rounded-3xl p-5 transition-transform hover:-translate-y-0.5`}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${c.iconTone} text-card`}
              >
                <c.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-base font-extrabold">{c.titulo}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{c.desc}</span>
              </span>
              <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-extrabold">Destaques</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {destaques.map((h) => (
          <Link
            key={h.t}
            to={h.to}
            className="card-soft group p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${h.tone}`}>
              <h.icon className="h-4 w-4" />
            </span>
            <p className="font-display text-sm font-bold">{h.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{h.d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
