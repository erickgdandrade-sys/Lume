import { useNavigate } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import { Bell, CalendarCheck, CheckCheck, GraduationCap, UserPen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MESES, useAlunos } from "@/lib/alunos-store";
import { modulos } from "@/lib/lume-data";
import { lidasStore } from "@/lib/perfil-store";
import { cn } from "@/lib/utils";

type Notificacao = {
  id: string;
  titulo: string;
  texto: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  ir: () => void;
};

function useNotificacoes(): Notificacao[] {
  const alunos = useAlunos();
  const navigate = useNavigate();
  const mesAtual = MESES[new Date().getMonth()] ?? "Jan";

  const lista: Notificacao[] = [];

  for (const m of modulos.filter((m) => m.estado === "atual")) {
    lista.push({
      id: `trilha-${m.id}-${m.concluidas}`,
      titulo: `Continue a trilha “${m.titulo}”`,
      texto: `Você concluiu ${m.concluidas} de ${m.aulas} aulas.`,
      icon: GraduationCap,
      tone: "bg-tangerine-soft",
      ir: () => navigate({ to: "/capacitacao" }),
    });
  }

  for (const a of alunos) {
    const semPerfil = !a.resumo || a.funcionam.length === 0;
    if (semPerfil) {
      lista.push({
        id: `perfil-${a.id}`,
        titulo: `Complete o perfil de ${a.nome}`,
        texto: "Adicione um resumo e o que funciona para esse aluno.",
        icon: UserPen,
        tone: "bg-lilac-soft",
        ir: () => navigate({ to: "/alunos/$id", params: { id: a.id } }),
      });
    }
    if (!a.evolucao.some((e) => e.mes === mesAtual)) {
      lista.push({
        id: `participacao-${a.id}-${mesAtual}`,
        titulo: `Registre a participação de ${a.nome}`,
        texto: `Ainda não há registro de ${mesAtual}.`,
        icon: CalendarCheck,
        tone: "bg-sky-soft",
        ir: () => navigate({ to: "/alunos/$id", params: { id: a.id } }),
      });
    }
  }

  return lista;
}

export function Notificacoes() {
  const [aberto, setAberto] = useState(false);
  const notificacoes = useNotificacoes();
  const lidas = lidasStore.use();
  const naoLidas = notificacoes.filter((n) => !lidas.includes(n.id));

  function marcarLida(id: string) {
    if (!lidas.includes(id)) lidasStore.set([...lidas, id]);
  }

  function marcarTodas() {
    lidasStore.set(Array.from(new Set([...lidas, ...notificacoes.map((n) => n.id)])));
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            naoLidas.length > 0 ? `Notificações: ${naoLidas.length} não lidas` : "Notificações"
          }
          className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {naoLidas.length > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-card ring-2 ring-background">
              {naoLidas.length > 9 ? "9+" : naoLidas.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="font-display text-sm font-extrabold">
            Notificações
            {naoLidas.length > 0 ? (
              <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
                ({naoLidas.length} novas)
              </span>
            ) : null}
          </p>
          {naoLidas.length > 0 ? (
            <button
              type="button"
              onClick={marcarTodas}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
            </button>
          ) : null}
        </div>

        {notificacoes.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Tudo em dia! Nenhum aviso no momento.
          </p>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto p-2">
            {notificacoes.map((n) => {
              const nova = !lidas.includes(n.id);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      marcarLida(n.id);
                      setAberto(false);
                      n.ir();
                    }}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary",
                      !nova && "opacity-60",
                    )}
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${n.tone}`}>
                      <n.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug">{n.titulo}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{n.texto}</span>
                    </span>
                    {nova ? (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" aria-label="Nova" />
                    ) : (
                      <span className="w-2" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
