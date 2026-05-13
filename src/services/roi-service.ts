import { prisma } from "@/lib/prisma";

export type CampaignRoiStatus =
  | "UNMAPPED"
  | "NO_REVENUE"
  | "PROFIT"
  | "LOSS"
  | "BREAK_EVEN";

export type GenerateCampaignRoiReportParams = {
  userId: string;
  projectId: string;
  metaAccountId?: string;
  dateFrom: Date;
  dateTo: Date;
};

export type CampaignRoiReportRow = {
  campaignId: string;
  campaignName: string;
  spend: number;
  clicks: number;
  impressions: number;
  cpc: number;
  cpm: number;
  ctr: number;
  revenueGross: number;
  revenueNet: number;
  profit: number;
  roi: number;
  roas: number;
  status: CampaignRoiStatus;
  mappingId?: string;
};

export type CampaignRoiDailyRow = {
  date: string;
  spend: number;
  revenueGross: number;
  revenueNet: number;
  profit: number;
  roi: number;
  roas: number;
};

export type CampaignRoiReport = {
  projectId: string;
  metaAccountId?: string;
  dateFrom: string;
  dateTo: string;
  totals: Omit<
    CampaignRoiReportRow,
    "campaignId" | "campaignName" | "mappingId" | "status"
  >;
  statusTotals: Record<CampaignRoiStatus, number>;
  dailyRows: CampaignRoiDailyRow[];
  rows: CampaignRoiReportRow[];
};

type InsightRow = {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  date: Date;
};

type MappingRow = {
  id: string;
  facebookCampaignId: string;
  activeViewValueOne: string;
  activeViewValueTwo: string | null;
};

type RevenueRow = {
  adUnit: string;
  country: string;
  domain: string;
  kvpKey: string;
  kvpValue: string;
  requestUri: string;
  utmSource: string;
  revenueGross: number;
  revenueNet: number;
  date: Date;
};

export async function generateCampaignRoiReport({
  dateFrom,
  dateTo,
  metaAccountId,
  projectId,
  userId,
}: GenerateCampaignRoiReportParams): Promise<CampaignRoiReport> {
  const [insights, mappings, revenueRows] = await Promise.all([
    prisma.metaInsight.findMany({
      where: {
        userId,
        projectId,
        ...(metaAccountId ? { metaAccountId } : {}),
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        campaignId: true,
        campaignName: true,
        spend: true,
        impressions: true,
        clicks: true,
        date: true,
      },
      orderBy: {
        date: "asc",
      },
    }),
    prisma.campaignMapping.findMany({
      where: {
        userId,
        projectId,
        ...(metaAccountId ? { metaAccountId } : {}),
      },
      select: {
        id: true,
        facebookCampaignId: true,
        activeViewValueOne: true,
        activeViewValueTwo: true,
      },
    }),
    prisma.gamRevenueRow.findMany({
      where: {
        userId,
        projectId,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        adUnit: true,
        country: true,
        domain: true,
        kvpKey: true,
        kvpValue: true,
        requestUri: true,
        utmSource: true,
        revenueGross: true,
        revenueNet: true,
        date: true,
      },
    }),
  ]);

  const typedMappings = mappings as MappingRow[];
  const typedInsights = insights as InsightRow[];
  const typedRevenueRows = revenueRows as RevenueRow[];
  const mappingByCampaignId = new Map<string, MappingRow>(
    typedMappings.map((mapping) => [mapping.facebookCampaignId, mapping]),
  );
  const insightsByCampaignId = groupInsightsByCampaign(typedInsights);
  const rows = buildCampaignRows({
    insightsByCampaignId,
    mappingByCampaignId,
    revenueRows: typedRevenueRows,
  });
  const totals = calculateTotals(rows);
  const statusTotals = calculateStatusTotals(rows);
  const dailyRows = buildDailyRows({
    insights: typedInsights,
    mappingByCampaignId,
    revenueRows: typedRevenueRows,
  });

  return {
    projectId,
    ...(metaAccountId ? { metaAccountId } : {}),
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    totals,
    statusTotals,
    dailyRows,
    rows,
  };
}

function groupInsightsByCampaign(insights: InsightRow[]) {
  const insightsByCampaignId = new Map<
    string,
    {
      campaignId: string;
      campaignName: string;
      spend: number;
      clicks: number;
      impressions: number;
    }
  >();

  for (const insight of insights) {
    const current = insightsByCampaignId.get(insight.campaignId) ?? {
      campaignId: insight.campaignId,
      campaignName: insight.campaignName,
      spend: 0,
      clicks: 0,
      impressions: 0,
    };

    current.campaignName = insight.campaignName || current.campaignName;
    current.spend += insight.spend;
    current.clicks += insight.clicks;
    current.impressions += insight.impressions;
    insightsByCampaignId.set(insight.campaignId, current);
  }

  return insightsByCampaignId;
}

function buildCampaignRows({
  insightsByCampaignId,
  mappingByCampaignId,
  revenueRows,
}: {
  insightsByCampaignId: ReturnType<typeof groupInsightsByCampaign>;
  mappingByCampaignId: Map<string, MappingRow>;
  revenueRows: RevenueRow[];
}) {
  const rows = Array.from(insightsByCampaignId.values()).map((campaign) => {
    const mapping = mappingByCampaignId.get(campaign.campaignId);
    const revenue = getMappedRevenueForCampaign(campaign, mapping, revenueRows);
    const profit = revenue.revenueNet - campaign.spend;
    const roi = campaign.spend > 0 ? (profit / campaign.spend) * 100 : 0;
    const roas = campaign.spend > 0 ? revenue.revenueGross / campaign.spend : 0;

    return {
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName,
      spend: campaign.spend,
      clicks: campaign.clicks,
      impressions: campaign.impressions,
      cpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0,
      cpm:
        campaign.impressions > 0
          ? (campaign.spend / campaign.impressions) * 1000
          : 0,
      ctr:
        campaign.impressions > 0
          ? (campaign.clicks / campaign.impressions) * 100
          : 0,
      revenueGross: revenue.revenueGross,
      revenueNet: revenue.revenueNet,
      profit,
      roi,
      roas,
      status: getCampaignStatus({
        hasMapping: Boolean(mapping) || revenue.revenueGross > 0 || revenue.revenueNet > 0,
        profit,
        revenueGross: revenue.revenueGross,
        revenueNet: revenue.revenueNet,
      }),
      ...(mapping ? { mappingId: mapping.id } : {}),
    } satisfies CampaignRoiReportRow;
  });

  return rows.sort((first, second) => second.profit - first.profit);
}

function buildDailyRows({
  insights,
  mappingByCampaignId,
  revenueRows,
}: {
  insights: InsightRow[];
  mappingByCampaignId: Map<string, MappingRow>;
  revenueRows: RevenueRow[];
}) {
  const campaignIdsByDate = new Map<string, Set<string>>();
  const dailyRows = new Map<
    string,
    {
      date: string;
      spend: number;
      revenueGross: number;
      revenueNet: number;
      profit: number;
      roi: number;
      roas: number;
    }
  >();

  for (const insight of insights) {
    const date = getDateKey(insight.date);
    const current = dailyRows.get(date) ?? createEmptyDailyRow(date);
    const campaignIds = campaignIdsByDate.get(date) ?? new Set<string>();

    current.spend += insight.spend;
    campaignIds.add(insight.campaignId);
    dailyRows.set(date, current);
    campaignIdsByDate.set(date, campaignIds);
  }

  for (const [date, campaignIds] of campaignIdsByDate.entries()) {
    const current = dailyRows.get(date) ?? createEmptyDailyRow(date);

    for (const campaignId of campaignIds) {
      const mapping = mappingByCampaignId.get(campaignId);
      const insight = insights.find(
        (item) =>
          item.campaignId === campaignId && getDateKey(item.date) === date,
      );

      if (!insight) {
        continue;
      }

      const revenue = getMappedRevenueForCampaign(
        insight,
        mapping,
        revenueRows.filter((row) => getDateKey(row.date) === date),
      );
      current.revenueGross += revenue.revenueGross;
      current.revenueNet += revenue.revenueNet;
    }

    current.profit = current.revenueNet - current.spend;
    current.roi =
      current.spend > 0 ? (current.profit / current.spend) * 100 : 0;
    current.roas = current.spend > 0 ? current.revenueGross / current.spend : 0;
    dailyRows.set(date, current);
  }

  return Array.from(dailyRows.values()).sort((first, second) =>
    first.date.localeCompare(second.date),
  );
}

function calculateTotals(rows: CampaignRoiReportRow[]) {
  const totals = rows.reduce<CampaignRoiReport["totals"]>(
    (accumulator, row) => {
      accumulator.spend += row.spend;
      accumulator.clicks += row.clicks;
      accumulator.impressions += row.impressions;
      accumulator.revenueGross += row.revenueGross;
      accumulator.revenueNet += row.revenueNet;
      accumulator.profit += row.profit;
      return accumulator;
    },
    {
      spend: 0,
      clicks: 0,
      impressions: 0,
      cpc: 0,
      cpm: 0,
      ctr: 0,
      revenueGross: 0,
      revenueNet: 0,
      profit: 0,
      roi: 0,
      roas: 0,
    },
  );

  totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  totals.cpm =
    totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  totals.ctr =
    totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.roi = totals.spend > 0 ? (totals.profit / totals.spend) * 100 : 0;
  totals.roas = totals.spend > 0 ? totals.revenueGross / totals.spend : 0;

  return totals;
}

function calculateStatusTotals(rows: CampaignRoiReportRow[]) {
  return rows.reduce<Record<CampaignRoiStatus, number>>(
    (accumulator, row) => {
      accumulator[row.status] += 1;
      return accumulator;
    },
    {
      UNMAPPED: 0,
      NO_REVENUE: 0,
      PROFIT: 0,
      LOSS: 0,
      BREAK_EVEN: 0,
    },
  );
}

function getMappedRevenueForCampaign(
  campaign: Pick<InsightRow, "campaignId" | "campaignName">,
  mapping: MappingRow | undefined,
  revenueRows: RevenueRow[],
) {
  const mappingKeys = new Set(
    [
      campaign.campaignId,
      campaign.campaignName,
      mapping?.facebookCampaignId,
      mapping?.activeViewValueOne,
      mapping?.activeViewValueTwo,
    ]
      .map((key) => normalizeKey(key))
      .filter((key): key is string => Boolean(key)),
  );

  return revenueRows.reduce(
    (accumulator, revenue) => {
      const revenueKeys = getRevenueMatchKeys(revenue)
        .map((key) => normalizeKey(key))
        .filter((key): key is string => Boolean(key));
      const hasMatch = revenueKeys.some((key) => mappingKeys.has(key));

      if (hasMatch) {
        accumulator.revenueGross += revenue.revenueGross;
        accumulator.revenueNet += revenue.revenueNet;
      }

      return accumulator;
    },
    { revenueGross: 0, revenueNet: 0 },
  );
}

function getRevenueMatchKeys(revenue: RevenueRow) {
  const keys = [
    revenue.kvpValue,
    revenue.requestUri,
    revenue.utmSource,
    revenue.adUnit,
    revenue.country,
    revenue.domain,
  ];

  if (revenue.kvpKey === "ad_id") {
    return [revenue.kvpValue, revenue.requestUri, revenue.adUnit];
  }

  if (revenue.kvpKey === "utm_campaign") {
    return [
      revenue.kvpValue,
      revenue.requestUri,
      revenue.utmSource,
      revenue.adUnit,
    ];
  }

  return keys;
}

function getCampaignStatus({
  hasMapping,
  profit,
  revenueGross,
  revenueNet,
}: {
  hasMapping: boolean;
  profit: number;
  revenueGross: number;
  revenueNet: number;
}): CampaignRoiStatus {
  if (!hasMapping) {
    return "UNMAPPED";
  }

  if (revenueGross === 0 && revenueNet === 0) {
    return "NO_REVENUE";
  }

  if (profit > 0) {
    return "PROFIT";
  }

  if (profit < 0) {
    return "LOSS";
  }

  return "BREAK_EVEN";
}

function createEmptyDailyRow(date: string): CampaignRoiDailyRow {
  return {
    date,
    spend: 0,
    revenueGross: 0,
    revenueNet: 0,
    profit: 0,
    roi: 0,
    roas: 0,
  };
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeKey(key: string | null | undefined) {
  const normalizedKey = key?.trim().toLowerCase();
  return normalizedKey || null;
}
