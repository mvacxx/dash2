import { z } from "zod";

export const connectionTypeSchema = z.enum(["META_API", "MANUAL"]);

const adAccountIdSchema = z
  .string()
  .trim()
  .min(5, "Informe um ID de conta válido.")
  .refine(
    (value) => value.startsWith("act_"),
    "O ID da conta precisa começar com act_.",
  );

const metaAccountBaseSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  label: z
    .string()
    .trim()
    .min(2, "Informe um nome para a conta."),
  adAccountId: adAccountIdSchema,
  connectionType: connectionTypeSchema.default("META_API"),
});

export const createMetaAccountSchema = metaAccountBaseSchema.extend({
  accessToken: z
    .string()
    .trim()
    .min(1, "Informe o access token."),
});

export const updateMetaAccountSchema = metaAccountBaseSchema.extend({
  accessToken: z.string().trim().optional(),
});
