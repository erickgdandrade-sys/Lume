import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { estrategias, tomSoft } from "@/lib/lume-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca de estratégias | Lume" },
      {
        name: "description",
        content:
          "Centenas de práticas inclusivas validadas: participação, comunicação, organização, regulação emocional e adaptações.",
      },
      { property: "og:title", content: "Biblioteca de estratégias | Lume" },
      {
        property: "og:description",
        content: "Encontre a prática certa para o contexto da sua turma.",
      },
    ],
  }),
  component: Biblioteca,
});

const categorias = [
  "Todas",
  "Participação",
  "Comunicação",
  "Organização",
  "Regulação emocional",
  "Adaptações pedagógicas",
];

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function Biblioteca() {
  const [cat, setCat] = useState("Todas");
  const [busca, setBusca] = useState("");

  const termo = normalizar(busca.trim());
  const lista = estrategias.filter(
    (e) =>
      (cat === "Todas" || e.categoria === cat) &&
      normalizar(e.titulo + " " + e.dica + " " + e.categoria).includes(termo),
  );

  return (
    <div>
      <PageHeader
        title="Biblioteca de estratégias"
        subtitle="Práticas rápidas, testadas em sala e prontas para usar amanhã."
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por situação, ex: “grupo”, “ruído”, “leitura”"
          aria-label="Buscar estratégias"
          className="h-12 rounded-full bg-card pl-11"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Categorias">
        {categorias.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              cat === c
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        {lista.length} {lista.length === 1 ? "estratégia" : "estratégias"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {lista.map((e) => (
          <div key={e.titulo} className={`rounded-3xl ${tomSoft[e.cor]} p-5`}>
            <span className="text-xs font-semibold text-muted-foreground">{e.categoria}</span>
            <p className="mt-1 font-display text-base font-extrabold">{e.titulo}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{e.dica}</p>
          </div>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma estratégia encontrada para essa busca.
        </p>
      ) : null}
    </div>
  );
}
