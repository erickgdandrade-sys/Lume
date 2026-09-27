import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Flame, Sparkles, Star, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { flashcards } from "@/lib/lume-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capacitacao/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards interativos | Lume" },
      {
        name: "description",
        content:
          "Pratique decisões reais de sala de aula com flashcards, XP e explicações amigáveis.",
      },
      { property: "og:title", content: "Flashcards interativos | Lume" },
      {
        property: "og:description",
        content: "Responda situações de sala e receba estratégias inclusivas na hora.",
      },
    ],
  }),
  component: Flashcards,
});

const letras = ["A", "B", "C", "D"];

function Flashcards() {
  const [idx, setIdx] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [xp, setXp] = useState(120);
  const [acertos, setAcertos] = useState(0);

  const card = flashcards[idx];
  if (!card) return null;

  const respondido = escolha !== null;
  const acertou = escolha === card.correta;
  const ultimo = idx === flashcards.length - 1;

  function responder(i: number) {
    if (respondido || !card) return;
    setEscolha(i);
    if (i === card.correta) {
      setXp((v) => v + 20);
      setAcertos((v) => v + 1);
    }
  }

  function avancar() {
    setIdx(ultimo ? 0 : idx + 1);
    setEscolha(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to="/capacitacao"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Progress
          value={((idx + (respondido ? 1 : 0)) / flashcards.length) * 100}
          className="h-2.5"
          aria-label="Progresso do módulo"
        />
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-xs font-semibold">
          <Star className="h-3.5 w-3.5" /> {xp} XP
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1.5">
          <Flame className="h-3.5 w-3.5" /> Sequência de 5 dias
        </span>
        <span className="rounded-full bg-leaf-soft px-3 py-1.5">
          {acertos} {acertos === 1 ? "acerto" : "acertos"} nesta sessão
        </span>
        <span className="rounded-full bg-secondary px-3 py-1.5">Módulo: Participação em grupo</span>
      </div>

      <div className="card-soft p-6">
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          Pergunta {idx + 1} de {flashcards.length}
        </p>
        <p className="mb-5 font-display text-lg font-extrabold leading-snug sm:text-xl">
          {card.pergunta}
        </p>
        <div className="space-y-3">
          {card.alternativas.map((alt, i) => {
            const certa = i === card.correta;
            const escolhida = i === escolha;
            return (
              <button
                key={alt}
                type="button"
                onClick={() => responder(i)}
                disabled={respondido}
                className={cn(
                  "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                  !respondido &&
                    "cursor-pointer border-border bg-card hover:border-primary hover:bg-accent",
                  respondido && certa && "border-leaf bg-leaf-soft",
                  respondido && escolhida && !certa && "border-coral bg-coral-soft",
                  respondido && !certa && !escolhida && "border-border bg-card opacity-60",
                )}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-display text-xs font-extrabold">
                  {letras[i]}
                </span>
                <span className="min-w-0">{alt}</span>
                {respondido && certa ? (
                  <Check className="h-4 w-4 shrink-0 text-foreground" aria-label="Correta" />
                ) : null}
                {respondido && escolhida && !certa ? (
                  <X className="h-4 w-4 shrink-0 text-foreground" aria-label="Incorreta" />
                ) : null}
              </button>
            );
          })}
        </div>

        {respondido ? (
          <div
            role="status"
            className={cn("mt-5 rounded-2xl p-4", acertou ? "bg-leaf-soft" : "bg-sun-soft")}
          >
            <p className="font-display text-sm font-bold">
              {acertou ? "Boa! +20 XP" : "Quase lá — veja o porquê"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{card.explicacao}</p>
          </div>
        ) : null}

        <button
          type="button"
          disabled={!respondido}
          onClick={avancar}
          className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" />
          {ultimo ? "Recomeçar módulo" : "Próxima pergunta"}
        </button>
      </div>
    </div>
  );
}
