import { z } from "zod";

const domainRegex =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const optionalNullableTrimmedString = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() ? value.trim() : null;
  }

  return value;
}, z.string().nullable().optional());

const optionalNullableUrl = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() ? value.trim() : null;
  }

  return value;
}, z.string().url("Informe uma URL base válida.").nullable().optional());

const bearerTokenSchema = z
  .string()
  .trim()
  .min(1, "Informe o token Bearer.")
  .refine(
    (token) => token.startsWith("Bearer "),
    "O token precisa começar com Bearer.",
  );

export const gamConnectionSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  networkCode: z
    .string()
    .trim()
    .min(2, "Informe o network code."),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (domain) => domainRegex.test(domain),
      "Informe um domínio válido, sem http ou caminho.",
    ),
  authToken: bearerTokenSchema,
  apiBaseUrl: optionalNullableUrl,
  reportEndpoint: optionalNullableTrimmedString,
});

export const updateGamConnectionSchema = gamConnectionSchema.extend({
  authToken: z.preprocess((value) => {
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    return undefined;
  }, bearerTokenSchema.optional()),
});
