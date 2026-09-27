import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { PlanoAdaptadoSchema, type AdaptarAulaResposta, type PerfilAnonimo } from "./plano-schema";
import { INSTRUCOES, montarPedido } from "./prompt-aula.server";

let client: Anthropic | null = null;

export async function adaptarAulaComClaude(
  apiKey: string,
  plano: string,
  alunos: PerfilAnonimo[],
): Promise<AdaptarAulaResposta> {
  client ??= new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(PlanoAdaptadoSchema) },
      system: INSTRUCOES,
      messages: [{ role: "user", content: montarPedido(plano, alunos) }],
    });

    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        erro: "A IA não conseguiu adaptar esse conteúdo. Revise o texto e tente de novo.",
      };
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return {
        ok: false,
        erro: "A resposta da IA veio incompleta. Tente de novo com um plano mais curto.",
      };
    }
    return { ok: true, plano: response.parsed_output };
  } catch (error) {
    console.error(error);
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, erro: "A chave da Anthropic é inválida. Confira o ANTHROPIC_API_KEY." };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, erro: "A chave não tem permissão para usar esse modelo." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        erro: "Muitas solicitações seguidas. Aguarde um minuto e tente de novo.",
      };
    }
    if (error instanceof Anthropic.BadRequestError && /credit|balance/i.test(error.message)) {
      return {
        ok: false,
        erro: "Sua conta da Anthropic está sem créditos. Adicione saldo em console.anthropic.com.",
      };
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return { ok: false, erro: "Não foi possível conectar à IA. Verifique sua internet." };
    }
    return { ok: false, erro: "Ocorreu um erro ao falar com a IA. Tente novamente em instantes." };
  }
}
