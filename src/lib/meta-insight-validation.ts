import { z } from "zod";

const levelSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? "campaign" : value),
  z.string().trim().min(1).default("campaign"),
);

export const metaInsightSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  metaAccountId: z.string().min(1, "Selecione uma conta Meta Ads."),
  campaignId: z.string().trim().min(1, "Informe o ID da campanha."),
  campaignName: z.string().trim().min(1, "Informe o nome da campanha."),
  spend: z.coerce.number().nonnegative("O gasto não pode ser negativo.").default(0),
  impressions: z.coerce.number().int().nonnegative("Impressões não podem ser negativas.").default(0),
  clicks: z.coerce.number().int().nonnegative("Cliques não podem ser negativos.").default(0),
  cpc: z.coerce.number().nonnegative("CPC não pode ser negativo.").default(0),
  cpm: z.coerce.number().nonnegative("CPM não pode ser negativo.").default(0),
  ctr: z.coerce.number().nonnegative("CTR não pode ser negativo.").default(0),
  date: z.coerce.date({ invalid_type_error: "Informe uma data válida." }),
  level: levelSchema,
});

export type MetaInsightInput = z.infer<typeof metaInsightSchema>;
