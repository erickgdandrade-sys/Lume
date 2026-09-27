/// <reference types="node" />

export type Provedor = "gemini" | "anthropic";

const CONFIG: Record<
  Provedor,
  { env: string; arquivo: string; entropia: string; prefixo: string }
> = {
  gemini: {
    env: "GEMINI_API_KEY",
    arquivo: ".gemini-key.dpapi",
    entropia: "lume-gemini-v1",
    prefixo: "AIza",
  },
  anthropic: {
    env: "ANTHROPIC_API_KEY",
    arquivo: ".anthropic-key.dpapi",
    entropia: "lume-anthropic-v1",
    prefixo: "sk-ant-",
  },
};

const encontradas: Partial<Record<Provedor, string>> = {};
let envCarregado = false;

function lerEnv(nome: string): string | undefined {
  const env = globalThis.process?.env;
  if (!env) return undefined;
  if (!env[nome] && !envCarregado) {
    envCarregado = true;
    try {
      process.loadEnvFile(".env");
    } catch {}
  }
  return env[nome] || undefined;
}

async function lerDpapi(arquivo: string, entropia: string): Promise<string | undefined> {
  if (globalThis.process?.platform !== "win32") return undefined;
  try {
    const { existsSync } = await import("node:fs");
    if (!existsSync(arquivo)) return undefined;
    const { execFileSync } = await import("node:child_process");
    const script = [
      "Add-Type -AssemblyName System.Security",
      `$e = [Text.Encoding]::UTF8.GetBytes('${entropia}')`,
      `$c = [Convert]::FromBase64String([IO.File]::ReadAllText('${arquivo}'))`,
      "$b = [Security.Cryptography.ProtectedData]::Unprotect($c, $e, 'CurrentUser')",
      "[Console]::Out.Write([Text.Encoding]::UTF8.GetString($b))",
    ].join("; ");
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 20_000,
    }).trim();
  } catch (error) {
    console.error(`Não foi possível descriptografar ${arquivo}.`, error);
    return undefined;
  }
}

export async function obterChave(provedor: Provedor): Promise<string | undefined> {
  const cfg = CONFIG[provedor];
  if (encontradas[provedor]) return encontradas[provedor];
  const chave = lerEnv(cfg.env) ?? (await lerDpapi(cfg.arquivo, cfg.entropia));
  if (chave?.startsWith(cfg.prefixo)) {
    encontradas[provedor] = chave;
    return chave;
  }
  return undefined;
}
