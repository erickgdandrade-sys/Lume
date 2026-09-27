import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { BarChart3, GraduationCap, Pencil, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { perfilStore, usePerfil } from "@/lib/perfil-store";
import { iniciais } from "@/lib/utils";

const FUNCOES = ["Professora", "Professor", "Coordenação", "Professor(a) de AEE", "Mediador(a)"];

export function MenuPerfil() {
  const perfil = usePerfil();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(perfil.nome);
  const [funcao, setFuncao] = useState(perfil.funcao);
  const [erro, setErro] = useState("");

  function abrirEdicao() {
    setNome(perfil.nome);
    setFuncao(perfil.funcao);
    setErro("");
    setEditando(true);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) {
      setErro("Digite pelo menos 2 letras.");
      return;
    }
    perfilStore.set({ nome: nome.trim(), funcao });
    setEditando(false);
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Menu do perfil de ${perfil.nome}`}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-tangerine-soft font-display text-sm font-bold text-foreground ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-tangerine data-[state=open]:ring-2 data-[state=open]:ring-tangerine"
          >
            {iniciais(perfil.nome) || "?"}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tangerine-soft font-display text-sm font-bold">
              {iniciais(perfil.nome) || "?"}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-extrabold">
                {perfil.nome}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                {perfil.funcao} · Nível 4
              </span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={abrirEdicao}>
            <Pencil /> Editar perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link to="/alunos">
              <Users /> Meus alunos
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link to="/capacitacao">
              <GraduationCap /> Minha capacitação
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
            <Link to="/relatorios">
              <BarChart3 /> Relatórios
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-extrabold">Editar perfil</DialogTitle>
            <DialogDescription>Esse nome aparece na saudação da página inicial.</DialogDescription>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="perfil-nome">Como quer ser chamada?</Label>
              <Input
                id="perfil-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-invalid={Boolean(erro)}
                className="rounded-xl bg-card"
                autoFocus
              />
              {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perfil-funcao">Função</Label>
              <select
                id="perfil-funcao"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                className="flex h-9 w-full cursor-pointer rounded-xl border border-input bg-card px-3 text-sm shadow-sm"
              >
                {Array.from(new Set([funcao, ...FUNCOES])).map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="cursor-pointer rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
              >
                Salvar
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
