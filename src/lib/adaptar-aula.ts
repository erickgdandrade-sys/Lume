import { createServerFn } from "@tanstack/react-start";
import { AdaptarAulaInputSchema, type AdaptarAulaResposta } from "./plano-schema";

export const adaptarAula = createServerFn({ method: "POST" })
  .validator(AdaptarAulaInputSchema)
  .handler(async ({ data }): Promise<AdaptarAulaResposta> => {
    const { adaptarAulaComIA } = await import("./ia.server");
    return adaptarAulaComIA(data.plano, data.alunos);
  });
