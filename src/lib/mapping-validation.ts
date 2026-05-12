import { z } from "zod";

export const trackingTypeSchema = z.enum([
  "UTM_CAMPAIGN",
  "CAMPAIGN_ID",
  "AD_ID",
  "ADSET_ID",
  "CUSTOM",
]);

export const campaignMappingSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  metaAccountId: z.string().min(1, "Selecione uma conta Meta Ads."),
  gamConnectionId: z.string().min(1, "Selecione uma conexão GAM."),
  facebookCampaignId: z
    .string()
    .trim()
    .min(1, "Informe o ID da campanha Meta Ads."),
  facebookCampaignName: z
    .string()
    .trim()
    .min(1, "Informe o nome da campanha Meta Ads."),
  trackingType: trackingTypeSchema.default("UTM_CAMPAIGN"),
  activeViewFieldOne: z
    .string()
    .trim()
    .min(1, "Informe o primeiro campo ActiveView/GAM."),
  activeViewValueOne: z
    .string()
    .trim()
    .min(1, "Informe o primeiro valor ActiveView/GAM."),
  activeViewFieldTwo: z.string().trim().optional(),
  activeViewValueTwo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
