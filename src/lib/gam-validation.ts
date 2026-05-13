import { z } from "zod";

const domainRegex =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const defaultKvpKey = "utm_campaign";
const maskedToken = "********";

const authTokenSchema = z
  .string()
  .trim()
  .transform(normalizeAuthToken)
  .pipe(
    z
      .string()
      .min(1, "Informe o token GAM / ActiveView.")
      .refine((token) => token !== maskedToken, "Informe um token válido."),
  );

function normalizeAuthToken(token: string) {
  return token.replace(/^Bearer\s+/i, "").trim();
}

export const gamConnectionSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  networkCode: z.string().trim().min(2, "Informe o network code."),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (domain) => domainRegex.test(domain),
      "Informe um domínio válido, sem http ou caminho.",
    ),
  kvpKey: z
    .string()
    .trim()
    .default(defaultKvpKey)
    .transform((value) => value || defaultKvpKey),
  authToken: authTokenSchema,
});

export const updateGamConnectionSchema = gamConnectionSchema.extend({
  authToken: z.preprocess((value) => {
    if (typeof value === "string") {
      const normalizedValue = normalizeAuthToken(value);

      if (normalizedValue && normalizedValue !== maskedToken) {
        return normalizedValue;
      }
    }

    return undefined;
  }, authTokenSchema.optional()),
});
