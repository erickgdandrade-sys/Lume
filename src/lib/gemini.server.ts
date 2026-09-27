import { z } from "zod/v4";
import { PlanoAdaptadoSchema, type AdaptarAulaResposta, type PerfilAnonimo } from "./plano-schema";
import { INSTRUCOES, montarPedido } from "./prompt-aula.server";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODELO_PADRAO = "gemini-3.8-flash";

const { $schema: _ignorado, ...SCHEMA_PLANO } = z.toJSONSchema(PlanoAdaptadoSchema) as Record<
  string,
  unknown
>;

type RespostaInteracao = {
  steps?: { type?: string; content?: { type?: string; text?: string }[] }[];
  error?: { message?: string; status?: string };
};

export async function adaptarAulaComGemini(
  apiKey: string,
  plano: string,
  alunos: PerfilAnonimo[],
): Promise<AdaptarAulaResposta> {
  const modelo = globalThis.process?.env?.["GEMINI_MODEL"] || MODELO_PADRAO;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        system_instruction: INSTRUCOES,
        input: montarPedido(plano, alunos),
        response_format: { type: "text", mime_type: "application/json", schema: SCHEMA_PLANO },
        store: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    console.error(error);
    return { ok: false, erro: "Não foi possível conectar à IA. Verifique sua internet." };
  }

  const bruto: unknown = await res.json().catch(() => ({}));
  const corpo = (Array.isArray(bruto) ? (bruto[0] ?? {}) : bruto) as RespostaInteracao;

  if (!res.ok) {
    console.error("Gemini", res.status, JSON.stringify(corpo).slice(0, 1000));
    if (res.status === 429) {
      return {
        ok: false,
        erro: "Limite gratuito da IA atingido por agora. Aguarde um minuto e tente de novo.",
      };
    }
    if (res.status === 400 && /api[_ ]?key/i.test(corpo.error?.message ?? "")) {
      return { ok: false, erro: "A chave do Gemini é inválida. Confira a GEMINI_API_KEY." };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, erro: "A chave do Gemini foi recusada. Confira a GEMINI_API_KEY." };
    }
    if (res.status === 404) {
      return {
        ok: false,
        erro: `O modelo "${modelo}" não está disponível. Defina outro em GEMINI_MODEL.`,
      };
    }
    return { ok: false, erro: "A IA está indisponível no momento. Tente novamente em instantes." };
  }

  const texto = (corpo.steps ?? [])
    .filter((s) => s.type === "model_output")
    .flatMap((s) => s.content ?? [])
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text)
    .join("");

  try {
    const plano = PlanoAdaptadoSchema.parse(JSON.parse(texto));
    return { ok: true, plano };
  } catch (error) {
    console.error("Resposta do Gemini fora do formato:", texto.slice(0, 500), error);
    return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
  }
}
