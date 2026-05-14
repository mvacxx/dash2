import { z } from "zod";

const domainRegex =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres."),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (domain) => domainRegex.test(domain),
      "Informe um domínio válido, sem http ou caminho.",
    ),
  timezone: z
    .string()
    .trim()
    .min(1, "Informe um timezone.")
    .default("America/Sao_Paulo"),
  currency: z
    .string()
    .trim()
    .min(3, "Informe uma moeda válida.")
    .max(3)
    .default("BRL"),
  loveTaxPercent: z.coerce
    .number()
    .min(0, "A taxa Love precisa ser maior ou igual a 0.")
    .default(0),
  operationalCostPercent: z.coerce
    .number()
    .min(0, "O custo operacional precisa ser maior ou igual a 0.")
    .default(0),
});

export type ProjectInput = z.infer<typeof projectSchema>;
