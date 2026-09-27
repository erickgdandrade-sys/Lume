import { createLocalStore } from "./local-store";
import type { PlanoAdaptado } from "./plano-schema";

export type PlanoSalvo = {
  id: string;
  criadoEm: string;
  original: string;
  resultado: PlanoAdaptado;
  nomes: Record<string, string>;
};

export const planosStore = createLocalStore<PlanoSalvo[]>("lume:planos:v1", []);

export function salvarPlano(plano: Omit<PlanoSalvo, "id" | "criadoEm">): PlanoSalvo {
  const novo: PlanoSalvo = {
    ...plano,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    criadoEm: new Date().toISOString(),
  };
  planosStore.set([novo, ...planosStore.get()]);
  return novo;
}

export function removerPlano(id: string) {
  planosStore.set(planosStore.get().filter((p) => p.id !== id));
}
