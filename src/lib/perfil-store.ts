import { createLocalStore } from "./local-store";

export type Perfil = { nome: string; funcao: string };

export const perfilStore = createLocalStore<Perfil>("lume:perfil:v1", {
  nome: "Lume",
  funcao: "Professora",
});

export const usePerfil = perfilStore.use;

export const lidasStore = createLocalStore<string[]>("lume:notificacoes-lidas:v1", []);
