import { cn } from "@/lib/utils";

type Ponto = { rotulo: string; valor: number };

export function ParticipacaoChart({
  dados,
  titulo,
  className,
}: {
  dados: Ponto[];
  titulo: string;
  className?: string;
}) {
  return (
    <figure className={cn("w-full", className)}>
      <div
        className="relative grid h-44 items-end gap-3 border-b border-border px-1"
        style={{ gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`${titulo}: ${dados.map((d) => `${d.rotulo} ${d.valor}%`).join(", ")}`}
      >
        {[25, 50, 75].map((linha) => (
          <span
            key={linha}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/70"
            style={{ bottom: `${linha}%` }}
          />
        ))}
        {dados.map((d) => (
          <div
            key={d.rotulo}
            tabIndex={0}
            className="group relative flex h-full flex-col items-center justify-end outline-none"
          >
            <span className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-lg bg-foreground px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-background opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {d.rotulo}: {d.valor}% de participação
            </span>
            <span className="mb-1 text-xs font-semibold text-foreground">{d.valor}%</span>
            <span
              className="w-full max-w-12 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(d.valor, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-2 grid gap-3 px-1"
        style={{ gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}
      >
        {dados.map((d) => (
          <span key={d.rotulo} className="text-center text-xs text-muted-foreground">
            {d.rotulo}
          </span>
        ))}
      </div>
    </figure>
  );
}
