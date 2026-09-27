import { obterChave } from "./chaves.server";
import type { AdaptarAulaResposta, PerfilAnonimo } from "./plano-schema";

export async function adaptarAulaComIA(
  plano: string,
  alunos: PerfilAnonimo[],
): Promise<AdaptarAulaResposta> {
  const gemini = await obterChave("gemini");
  if (gemini) {
    const { adaptarAulaComGemini } = await import("./gemini.server");
    return adaptarAulaComGemini(gemini, plano, alunos);
  }

  const anthropic = await obterChave("anthropic");
  if (anthropic) {
    const { adaptarAulaComClaude } = await import("./claude.server");
    return adaptarAulaComClaude(anthropic, plano, alunos);
  }

  return {
    ok: false,
    erro: "Nenhuma IA configurada. Crie uma chave grátis em aistudio.google.com/apikey e salve com `npm run chave` (ou defina GEMINI_API_KEY na hospedagem).",
  };
}
