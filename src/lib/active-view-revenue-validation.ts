import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const activeViewRevenueSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  gamConnectionId: z.string().min(1, "Selecione uma conexão GAM."),
  date: z.coerce.date({ invalid_type_error: "Informe uma data válida." }),
  domain: z.string().trim().min(1, "Informe o domínio."),
  networkCode: z.string().trim().min(1, "Informe o network code."),
  source: optionalTrimmedString,
  campaignKey: optionalTrimmedString,
  adKey: optionalTrimmedString,
  revenueGross: z.coerce.number().nonnegative("Receita bruta não pode ser negativa.").default(0),
  revenueNet: z.coerce.number().nonnegative("Receita líquida não pode ser negativa.").default(0),
  views: z.coerce.number().int().nonnegative("Views não podem ser negativas.").default(0),
  rpm: z.coerce.number().nonnegative("RPM não pode ser negativo.").default(0),
  currency: z.string().trim().min(3, "Informe a moeda.").max(3, "Use o código ISO de 3 letras.").default("BRL"),
  rawJson: z.any().optional(),
});

export type ActiveViewRevenueInput = z.infer<typeof activeViewRevenueSchema>;
