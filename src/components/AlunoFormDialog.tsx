import { useState, type FormEvent, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adicionarAluno, atualizarAluno, type AlunoDados } from "@/lib/alunos-store";
import type { Aluno } from "@/lib/lume-data";
import { cn } from "@/lib/utils";

const SERIES = [
  "Educação Infantil",
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
];

const PERFIS = [
  "TEA",
  "TDAH",
  "Dislexia",
  "Discalculia",
  "Deficiência intelectual",
  "Deficiência auditiva",
  "Deficiência visual",
  "Deficiência física",
  "Altas habilidades",
  "Comunicação alternativa",
];

const SUPORTES: Aluno["suporte"][] = ["Leve", "Médio", "Alto"];

type Valores = {
  nome: string;
  serie: string;
  idade: string;
  suporte: Aluno["suporte"];
  tags: string[];
  resumo: string;
  funcionam: string;
  naoFuncionam: string;
  caracteristicas: string;
  preferencias: string;
  sensorial: string;
  familia: string;
};

function valoresIniciais(aluno?: Aluno): Valores {
  return {
    nome: aluno?.nome ?? "",
    serie: aluno?.serie ?? "4º ano",
    idade: aluno ? String(aluno.idade) : "",
    suporte: aluno?.suporte ?? "Leve",
    tags: aluno?.tags ?? [],
    resumo: aluno?.resumo ?? "",
    funcionam: aluno?.funcionam.join("\n") ?? "",
    naoFuncionam: aluno?.naoFuncionam.join("\n") ?? "",
    caracteristicas: aluno?.caracteristicas.join("\n") ?? "",
    preferencias: aluno?.preferencias.join("\n") ?? "",
    sensorial: aluno?.sensorial.join("\n") ?? "",
    familia: aluno?.familia ?? "",
  };
}

const linhas = (texto: string) =>
  texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const campoClasse = "rounded-xl bg-card";

export function AlunoFormDialog({
  aluno,
  trigger,
  onSalvo,
}: {
  aluno?: Aluno;
  trigger: ReactNode;
  onSalvo?: (aluno: Aluno) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState<Valores>(() => valoresIniciais(aluno));
  const [outroPerfil, setOutroPerfil] = useState("");
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({});

  const editando = Boolean(aluno);
  const set = <K extends keyof Valores>(campo: K, valor: Valores[K]) =>
    setV((atual) => ({ ...atual, [campo]: valor }));

  function abrirOuFechar(abrir: boolean) {
    if (abrir) {
      setV(valoresIniciais(aluno));
      setErros({});
      setOutroPerfil("");
    }
    setAberto(abrir);
  }

  function alternarPerfil(p: string) {
    set("tags", v.tags.includes(p) ? v.tags.filter((t) => t !== p) : [...v.tags, p]);
  }

  function adicionarOutro() {
    const p = outroPerfil.trim();
    if (p && !v.tags.includes(p)) set("tags", [...v.tags, p]);
    setOutroPerfil("");
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const idade = Number(v.idade);
    const novosErros: typeof erros = {};
    if (v.nome.trim().length < 3) novosErros.nome = "Informe o nome completo do aluno.";
    if (!Number.isInteger(idade) || idade < 2 || idade > 20)
      novosErros.idade = "Informe uma idade entre 2 e 20 anos.";
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    const dados: AlunoDados = {
      nome: v.nome.trim(),
      serie: v.serie,
      idade,
      suporte: v.suporte,
      tags: v.tags,
      resumo: v.resumo.trim(),
      funcionam: linhas(v.funcionam),
      naoFuncionam: linhas(v.naoFuncionam),
      caracteristicas: linhas(v.caracteristicas),
      preferencias: linhas(v.preferencias),
      sensorial: linhas(v.sensorial),
      familia: v.familia.trim(),
    };

    if (aluno) {
      atualizarAluno(aluno.id, dados);
      onSalvo?.({ ...aluno, ...dados });
    } else {
      onSalvo?.(adicionarAluno(dados));
    }
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={abrirOuFechar}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">
            {editando ? "Editar perfil do aluno" : "Cadastrar aluno"}
          </DialogTitle>
          <DialogDescription>
            Só o nome e a idade são obrigatórios. Você pode completar o restante depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                value={v.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex.: Ana Beatriz Costa"
                aria-invalid={Boolean(erros.nome)}
                className={campoClasse}
                autoFocus
              />
              {erros.nome ? <p className="text-xs text-destructive">{erros.nome}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serie">Série</Label>
              <select
                id="serie"
                value={v.serie}
                onChange={(e) => set("serie", e.target.value)}
                className="flex h-9 w-full cursor-pointer rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              >
                {SERIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="idade">Idade *</Label>
              <Input
                id="idade"
                type="number"
                inputMode="numeric"
                min={2}
                max={20}
                value={v.idade}
                onChange={(e) => set("idade", e.target.value)}
                placeholder="9"
                aria-invalid={Boolean(erros.idade)}
                className={campoClasse}
              />
              {erros.idade ? <p className="text-xs text-destructive">{erros.idade}</p> : null}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Nível de suporte</legend>
            <div className="grid grid-cols-3 gap-2">
              {SUPORTES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={v.suporte === s}
                  onClick={() => set("suporte", s)}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    v.suporte === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Perfil / necessidades</legend>
            <div className="flex flex-wrap gap-2">
              {[...PERFIS, ...v.tags.filter((t) => !PERFIS.includes(t))].map((p) => {
                const ativo = v.tags.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => alternarPerfil(p)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      ativo
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p}
                    {ativo ? <X className="h-3 w-3" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={outroPerfil}
                onChange={(e) => setOutroPerfil(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarOutro();
                  }
                }}
                placeholder="Outro (ex.: TOD, Síndrome de Down)"
                aria-label="Outro perfil"
                className={campoClasse}
              />
              <button
                type="button"
                onClick={adicionarOutro}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="resumo">Resumo</Label>
            <Textarea
              id="resumo"
              value={v.resumo}
              onChange={(e) => set("resumo", e.target.value)}
              placeholder="Em uma frase: como esse aluno aprende melhor?"
              className={cn(campoClasse, "min-h-16 resize-none")}
            />
          </div>

          <p className="rounded-xl bg-sky-soft px-3 py-2 text-xs text-muted-foreground">
            Nos campos abaixo, escreva <strong>um item por linha</strong>.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["funcionam", "O que funciona", "Instruções em etapas curtas"],
                ["naoFuncionam", "O que evitar", "Pedidos verbais longos"],
                ["caracteristicas", "Características", "Gosta de dinossauros"],
                ["preferencias", "Preferências", "Trabalhar em dupla"],
                ["sensorial", "Sensorial", "Incomoda-se com ruído alto"],
              ] as const
            ).map(([campo, rotulo, exemplo]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={campo}>{rotulo}</Label>
                <Textarea
                  id={campo}
                  value={v[campo]}
                  onChange={(e) => set(campo, e.target.value)}
                  placeholder={`Ex.: ${exemplo}`}
                  className={cn(campoClasse, "min-h-20 resize-y")}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="familia">Relato da família</Label>
              <Textarea
                id="familia"
                value={v.familia}
                onChange={(e) => set("familia", e.target.value)}
                placeholder="O que a família compartilhou sobre a rotina em casa"
                className={cn(campoClasse, "min-h-20 resize-y")}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="cursor-pointer rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
            >
              {editando ? "Salvar alterações" : "Cadastrar aluno"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
