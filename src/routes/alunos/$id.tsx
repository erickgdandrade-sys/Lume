import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Ear,
  Heart,
  Home,
  NotebookPen,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { AlunoFormDialog } from "@/components/AlunoFormDialog";
import { ParticipacaoChart } from "@/components/ParticipacaoChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MESES,
  adicionarNota,
  registrarParticipacao,
  removerAluno,
  useAluno,
} from "@/lib/alunos-store";
import { suporteTom } from "@/lib/lume-data";
import { iniciais } from "@/lib/utils";

export const Route = createFileRoute("/alunos/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do aluno | Lume" },
      { name: "description", content: "Perfil detalhado do aluno e estratégias que funcionam." },
    ],
  }),
  component: PerfilAluno,
});

function Secao({
  icon,
  titulo,
  itens,
  tone = "card-soft",
}: {
  icon: ReactNode;
  titulo: string;
  itens: string[];
  tone?: string;
}) {
  return (
    <section className={`${tone} rounded-3xl p-5`}>
      <h2 className="inline-flex items-center gap-2 font-display text-sm font-bold">
        {icon} {titulo}
      </h2>
      {itens.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {itens.map((i) => (
            <li key={i}>• {i}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm italic text-muted-foreground">Nada registrado ainda.</p>
      )}
    </section>
  );
}

function RegistrarParticipacao({ id }: { id: string }) {
  const [mes, setMes] = useState<string>(MESES[new Date().getMonth()] ?? "Jan");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    const n = Number(valor);
    if (valor === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      setErro("Informe um valor entre 0 e 100.");
      return;
    }
    registrarParticipacao(id, mes, Math.round(n));
    setValor("");
    setErro("");
  }

  return (
    <form onSubmit={enviar} className="mt-5 border-t border-border pt-4">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Registrar participação</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          aria-label="Mês"
          className="h-9 cursor-pointer rounded-xl border border-input bg-card px-3 text-sm"
        >
          {MESES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="relative w-28">
          <Input
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0–100"
            aria-label="Participação em %"
            className="rounded-xl bg-card pr-7"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            %
          </span>
        </div>
        <button
          type="submit"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Registrar
        </button>
      </div>
      {erro ? <p className="mt-1.5 text-xs text-destructive">{erro}</p> : null}
    </form>
  );
}

function NovaNota({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar anotação
      </button>
    );
  }

  return (
    <form
      className="mt-4 space-y-2 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!texto.trim()) return;
        adicionarNota(id, titulo.trim() || "Anotação", texto.trim());
        setTitulo("");
        setTexto("");
        setAberto(false);
      }}
    >
      <Input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (ex.: Comportamento)"
        aria-label="Título da anotação"
        className="rounded-xl bg-card"
        autoFocus
      />
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="O que você observou?"
        aria-label="Texto da anotação"
        className="min-h-20 rounded-xl bg-card"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="cursor-pointer rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!texto.trim()}
          className="cursor-pointer rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}

function PerfilAluno() {
  const { id } = Route.useParams();
  const aluno = useAluno(id);
  const navigate = useNavigate();

  if (!aluno) {
    return (
      <div className="card-soft mx-auto max-w-md p-10 text-center">
        <p className="font-display text-lg font-extrabold">Aluno não encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">Esse perfil pode ter sido excluído.</p>
        <Link
          to="/alunos"
          className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ver todos os alunos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to="/alunos"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card"
          aria-label="Voltar para alunos"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="truncate text-sm font-semibold text-muted-foreground">Perfis dos alunos</p>
        <div className="flex shrink-0 gap-2">
          <AlunoFormDialog
            aluno={aluno}
            trigger={
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Excluir aluno"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-border bg-card text-muted-foreground hover:bg-coral-soft hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir o perfil de {aluno.nome}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todas as informações, anotações e registros de participação desse aluno serão
                  apagados. Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    removerAluno(aluno.id);
                    navigate({ to: "/alunos" });
                  }}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="card-soft brand-halo mb-6 p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-sky-soft font-display text-xl font-extrabold">
            {iniciais(aluno.nome)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">
              {aluno.nome}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {aluno.serie} · {aluno.idade} anos · atualizado em {aluno.atualizado}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full ${suporteTom[aluno.suporte]} px-3 py-1.5 text-xs font-semibold`}
          >
            Suporte {aluno.suporte.toLowerCase()}
          </span>
          {aluno.tags.map((t) => (
            <span key={t} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold">
              {t}
            </span>
          ))}
        </div>
        {aluno.resumo ? (
          <p className="mt-5 rounded-2xl bg-card/80 p-4 text-sm">
            <Sparkles className="mr-1.5 inline h-4 w-4 align-[-3px]" />
            {aluno.resumo}
          </p>
        ) : null}
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Secao
          tone="bg-leaf-soft"
          icon={<CheckCircle2 className="h-4 w-4" />}
          titulo="O que funciona"
          itens={aluno.funcionam}
        />
        <Secao
          tone="bg-coral-soft"
          icon={<XCircle className="h-4 w-4" />}
          titulo="O que evitar"
          itens={aluno.naoFuncionam}
        />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Secao
          icon={<UserRound className="h-4 w-4" />}
          titulo="Características"
          itens={aluno.caracteristicas}
        />
        <Secao
          icon={<Heart className="h-4 w-4" />}
          titulo="Preferências"
          itens={aluno.preferencias}
        />
        <Secao icon={<Ear className="h-4 w-4" />} titulo="Sensorial" itens={aluno.sensorial} />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="card-soft p-5">
          <h2 className="font-display text-sm font-bold">Participação nas aulas</h2>
          <p className="mb-6 mt-0.5 text-xs text-muted-foreground">
            % de atividades com participação ativa, por mês
          </p>
          {aluno.evolucao.length > 0 ? (
            <ParticipacaoChart
              titulo="Participação nas aulas"
              dados={aluno.evolucao.map((e) => ({ rotulo: e.mes, valor: e.participacao }))}
            />
          ) : (
            <p className="rounded-2xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum registro ainda. Registre a participação do mês abaixo.
            </p>
          )}
          <RegistrarParticipacao id={aluno.id} />
        </section>

        <section className="card-soft p-5">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-bold">
            <NotebookPen className="h-4 w-4" /> Histórico e anotações
          </h2>
          {aluno.historico.length > 0 ? (
            <div className="mt-3 space-y-3">
              {aluno.historico.map((h, i) => (
                <div key={`${h.titulo}-${i}`}>
                  <p className="text-sm font-semibold">{h.titulo}</p>
                  <p className="text-sm text-muted-foreground">{h.texto}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm italic text-muted-foreground">Nenhuma anotação ainda.</p>
          )}
          <NovaNota id={aluno.id} />
        </section>
      </div>

      <section className="rounded-3xl bg-sun-soft p-5">
        <h2 className="inline-flex items-center gap-2 font-display text-sm font-bold">
          <Home className="h-4 w-4" /> Relato da família
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {aluno.familia || "Nenhum relato registrado. Use “Editar” para adicionar."}
        </p>
      </section>
    </div>
  );
}
