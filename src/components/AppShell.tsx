import { Link, useRouterState } from "@tanstack/react-router";
import { Home, GraduationCap, Sparkles, Users, BookOpen, BarChart3, Flame } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/lume-logo.png";
import { MenuPerfil } from "@/components/MenuPerfil";
import { Notificacoes } from "@/components/Notificacoes";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/capacitacao", label: "Capacitação", icon: GraduationCap },
  { to: "/planejamento", label: "Planejamento", icon: Sparkles },
  { to: "/alunos", label: "Alunos", icon: Users },
  { to: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

const paginaEstatica = import.meta.env["VITE_SEM_SERVIDOR"] === "true";

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

export function LumeLogo({ className }: { className?: string }) {
  return <img src={logo} alt="Lume" className={cn("h-10 w-auto", className)} />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [montado, setMontado] = useState(!paginaEstatica);
  useEffect(() => setMontado(true), []);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 block px-2" aria-label="Lume — início">
          <LumeLogo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
          {nav.map((item) => {
            const active = montado && isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-2xl bg-sun-soft p-4">
          <p className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
            <Flame className="h-4 w-4" /> Sequência de 5 dias
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Continue aprendendo para manter seu ritmo.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" className="lg:hidden" aria-label="Lume — início">
              <LumeLogo className="h-8" />
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Notificacoes />
            <MenuPerfil />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-card/95 px-1 py-2 backdrop-blur lg:hidden"
      >
        {nav.map((item) => {
          const active = montado && isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
