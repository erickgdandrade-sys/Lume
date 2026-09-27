import { useSyncExternalStore } from "react";

export function createLocalStore<T>(chave: string, padrao: T) {
  let cache: { valor: T } | null = null;
  const ouvintes = new Set<() => void>();

  function get(): T {
    if (cache) return cache.valor;
    try {
      const bruto = window.localStorage.getItem(chave);
      cache = { valor: bruto === null ? padrao : (JSON.parse(bruto) as T) };
    } catch {
      cache = { valor: padrao };
    }
    return cache.valor;
  }

  function set(valor: T) {
    cache = { valor };
    try {
      window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch {}
    ouvintes.forEach((o) => o());
  }

  function subscribe(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    const aoMudar = (e: StorageEvent) => {
      if (e.key === chave) {
        cache = null;
        ouvinte();
      }
    };
    window.addEventListener("storage", aoMudar);
    return () => {
      ouvintes.delete(ouvinte);
      window.removeEventListener("storage", aoMudar);
    };
  }

  function use(): T {
    return useSyncExternalStore(subscribe, get, () => padrao);
  }

  return { get, set, use };
}
