import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type MetaInsightApiRow = {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  date_start?: string;
  date_stop?: string;
};

type MetaInsightsApiResponse = {
  data?: MetaInsightApiRow[];
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type GetMetaCampaignInsightsParams = {
  accessToken: string;
  adAccountId: string;
  dateFrom: Date;
  dateTo: Date;
};

type SyncMetaInsightsParams = {
  userId: string;
  projectId: string;
  metaAccountId: string;
  dateFrom: Date;
  dateTo: Date;
};

export type SyncMetaInsightsResult = {
  count: number;
  dateFrom: string;
  dateTo: string;
};

const metaInsightFields = [
  "campaign_id",
  "campaign_name",
  "spend",
  "impressions",
  "clicks",
  "cpc",
  "cpm",
  "ctr",
  "date_start",
  "date_stop",
].join(",");

export async function getMetaCampaignInsights({
  accessToken,
  adAccountId,
  dateFrom,
  dateTo,
}: GetMetaCampaignInsightsParams) {
  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION ?? "v20.0";
  const insights: MetaInsightApiRow[] = [];
  let nextUrl: string | null = buildInsightsUrl({
    accessToken,
    adAccountId,
    dateFrom,
    dateTo,
    graphVersion,
  });

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
    const payload = (await response
      .json()
      .catch(() => null)) as MetaInsightsApiResponse | null;

    if (!response.ok || payload?.error) {
      throw new Error(
        payload?.error?.message ??
          "Não foi possível buscar insights da Meta Ads API.",
      );
    }

    insights.push(...(payload?.data ?? []));
    nextUrl = payload?.paging?.next ?? null;
  }

  return insights;
}

export async function syncMetaInsights({
  dateFrom,
  dateTo,
  metaAccountId,
  projectId,
  userId,
}: SyncMetaInsightsParams): Promise<SyncMetaInsightsResult> {
  const metaAccount = await prisma.metaAccount.findFirst({
    where: {
      id: metaAccountId,
      projectId,
      userId,
    },
    select: {
      accessToken: true,
      adAccountId: true,
    },
  });

  if (!metaAccount) {
    throw new Error("Conta Meta Ads não encontrada para este projeto.");
  }

  const accessToken = decryptToken(metaAccount.accessToken);
  const insights = await getMetaCampaignInsights({
    accessToken,
    adAccountId: metaAccount.adAccountId,
    dateFrom,
    dateTo,
  });
  let count = 0;

  const operations = insights
    .filter((insight) => insight.campaign_id && insight.date_start)
    .map((insight) => {
      count += 1;
      const date = parseMetaDate(
        insight.date_start ?? toDateInputValue(dateFrom),
      );

      return prisma.metaInsight.upsert({
        where: {
          projectId_metaAccountId_campaignId_date_level: {
            projectId,
            metaAccountId,
            campaignId: insight.campaign_id ?? "",
            date,
            level: "campaign",
          },
        },
        create: {
          userId,
          projectId,
          metaAccountId,
          campaignId: insight.campaign_id ?? "",
          campaignName:
            insight.campaign_name ?? insight.campaign_id ?? "Campanha sem nome",
          spend: parseMetaNumber(insight.spend),
          impressions: parseMetaInteger(insight.impressions),
          clicks: parseMetaInteger(insight.clicks),
          cpc: parseMetaNumber(insight.cpc),
          cpm: parseMetaNumber(insight.cpm),
          ctr: parseMetaNumber(insight.ctr),
          date,
          level: "campaign",
        },
        update: {
          campaignName:
            insight.campaign_name ?? insight.campaign_id ?? "Campanha sem nome",
          spend: parseMetaNumber(insight.spend),
          impressions: parseMetaInteger(insight.impressions),
          clicks: parseMetaInteger(insight.clicks),
          cpc: parseMetaNumber(insight.cpc),
          cpm: parseMetaNumber(insight.cpm),
          ctr: parseMetaNumber(insight.ctr),
        },
      });
    });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }

  return {
    count,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}

function buildInsightsUrl({
  accessToken,
  adAccountId,
  dateFrom,
  dateTo,
  graphVersion,
}: GetMetaCampaignInsightsParams & { graphVersion: string }) {
  const url = new URL(
    `https://graph.facebook.com/${graphVersion}/${adAccountId}/insights`,
  );

  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("level", "campaign");
  url.searchParams.set("fields", metaInsightFields);
  url.searchParams.set(
    "time_range",
    JSON.stringify({
      since: toDateInputValue(dateFrom),
      until: toDateInputValue(dateTo),
    }),
  );
  url.searchParams.set("time_increment", "1");

  return url.toString();
}

function parseMetaDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseMetaNumber(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMetaInteger(value?: string) {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
