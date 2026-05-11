import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type ActiveViewReportParams = {
  apiBaseUrl: string;
  reportEndpoint: string;
  authToken: string;
  dateFrom: Date;
  dateTo: Date;
  domain: string;
  networkCode: string;
  fieldOne?: string;
  valueOne?: string;
  fieldTwo?: string;
  valueTwo?: string;
};

type SyncActiveViewRevenueParams = {
  userId: string;
  projectId: string;
  gamConnectionId: string;
  dateFrom: Date;
  dateTo: Date;
  domain?: string;
  networkCode?: string;
  fieldOne?: string;
  valueOne?: string;
  fieldTwo?: string;
  valueTwo?: string;
};

export type NormalizedActiveViewRevenue = {
  date: Date;
  domain: string;
  networkCode: string;
  source?: string;
  campaignKey?: string;
  adKey?: string;
  revenueGross: number;
  revenueNet: number;
  views: number;
  rpm: number;
  currency: string;
  rawJson: unknown;
};

export type SyncActiveViewRevenueResult = {
  count: number;
  dateFrom: string;
  dateTo: string;
};

export async function getActiveViewReport(params: ActiveViewReportParams) {
  const url = buildReportUrl(params);
  const token = normalizeBearerToken(params.authToken);
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(
      getPayloadError(payload) ??
        "Não foi possível buscar o relatório ActiveView/GAM.",
    );
  }

  return payload;
}

export function normalizeActiveViewResponse(
  payload: unknown,
  fallback: {
    dateFrom: Date;
    domain: string;
    networkCode: string;
  },
): NormalizedActiveViewRevenue[] {
  return extractRows(payload).map((row) => ({
    date: parseReportDate(
      readString(row, ["date", "day", "date_start", "dateStart"]) ??
        fallback.dateFrom,
    ),
    domain:
      readString(row, ["domain", "site", "host", "hostname"]) ??
      fallback.domain,
    networkCode:
      readString(row, [
        "networkCode",
        "network_code",
        "network",
        "network_id",
      ]) ?? fallback.networkCode,
    source: readString(row, ["source", "channel", "platform", "utm_source"]),
    campaignKey: readString(row, [
      "campaignKey",
      "campaign_key",
      "campaign",
      "campaign_id",
      "utm_campaign",
    ]),
    adKey: readString(row, [
      "adKey",
      "ad_key",
      "ad",
      "ad_id",
      "creative_id",
      "utm_content",
    ]),
    revenueGross: readNumber(row, [
      "revenueGross",
      "revenue_gross",
      "grossRevenue",
      "gross_revenue",
      "revenue",
      "earnings",
    ]),
    revenueNet: readNumber(row, [
      "revenueNet",
      "revenue_net",
      "netRevenue",
      "net_revenue",
      "net",
      "revenue",
    ]),
    views: readInteger(row, [
      "views",
      "pageviews",
      "page_views",
      "impressions",
      "ad_impressions",
    ]),
    rpm: readNumber(row, ["rpm", "pageRpm", "page_rpm", "ecpm", "eCPM"]),
    currency:
      readString(row, ["currency", "currencyCode", "currency_code"]) ?? "BRL",
    rawJson: row,
  }));
}

export async function syncActiveViewRevenue({
  dateFrom,
  dateTo,
  domain,
  fieldOne,
  fieldTwo,
  gamConnectionId,
  networkCode,
  projectId,
  userId,
  valueOne,
  valueTwo,
}: SyncActiveViewRevenueParams): Promise<SyncActiveViewRevenueResult> {
  const connection = await prisma.gamConnection.findFirst({
    where: {
      id: gamConnectionId,
      projectId,
      userId,
    },
    select: {
      apiBaseUrl: true,
      authToken: true,
      domain: true,
      networkCode: true,
      reportEndpoint: true,
    },
  });

  if (!connection) {
    throw new Error("Conexão GAM não encontrada para este projeto.");
  }

  const syncDomain = domain?.trim() || connection.domain;
  const syncNetworkCode = networkCode?.trim() || connection.networkCode;
  const payload = await getActiveViewReport({
    apiBaseUrl: connection.apiBaseUrl,
    reportEndpoint: connection.reportEndpoint,
    authToken: decryptToken(connection.authToken),
    dateFrom,
    dateTo,
    domain: syncDomain,
    networkCode: syncNetworkCode,
    fieldOne,
    valueOne,
    fieldTwo,
    valueTwo,
  });
  const revenueRows = normalizeActiveViewResponse(payload, {
    dateFrom,
    domain: syncDomain,
    networkCode: syncNetworkCode,
  });
  let count = 0;

  for (const row of revenueRows) {
    count += 1;
    const existingRevenue = await prisma.activeViewRevenue.findFirst({
      where: {
        userId,
        projectId,
        gamConnectionId,
        date: row.date,
        domain: row.domain,
        campaignKey: row.campaignKey ?? null,
        adKey: row.adKey ?? null,
      },
      select: {
        id: true,
      },
    });
    const data = {
      date: row.date,
      domain: row.domain,
      networkCode: row.networkCode,
      source: row.source,
      campaignKey: row.campaignKey,
      adKey: row.adKey,
      revenueGross: row.revenueGross,
      revenueNet: row.revenueNet,
      views: row.views,
      rpm: row.rpm,
      currency: row.currency,
      rawJson: row.rawJson as never,
    };

    if (existingRevenue) {
      await prisma.activeViewRevenue.update({
        where: {
          id: existingRevenue.id,
        },
        data,
      });
    } else {
      await prisma.activeViewRevenue.create({
        data: {
          ...data,
          userId,
          projectId,
          gamConnectionId,
        },
      });
    }
  }

  return {
    count,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}

function buildReportUrl({
  apiBaseUrl,
  dateFrom,
  dateTo,
  domain,
  fieldOne,
  fieldTwo,
  networkCode,
  reportEndpoint,
  valueOne,
  valueTwo,
}: ActiveViewReportParams) {
  const baseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`;
  const endpoint = reportEndpoint.startsWith("http")
    ? reportEndpoint
    : reportEndpoint.replace(/^\/+/, "");
  const url = new URL(endpoint, baseUrl);

  url.searchParams.set("dateFrom", toDateInputValue(dateFrom));
  url.searchParams.set("dateTo", toDateInputValue(dateTo));
  url.searchParams.set("domain", domain);
  url.searchParams.set("networkCode", networkCode);

  if (fieldOne) {
    url.searchParams.set("fieldOne", fieldOne);
  }

  if (valueOne) {
    url.searchParams.set("valueOne", valueOne);
  }

  if (fieldTwo) {
    url.searchParams.set("fieldTwo", fieldTwo);
  }

  if (valueTwo) {
    url.searchParams.set("valueTwo", valueTwo);
  }

  return url.toString();
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ["data", "rows", "results", "items", "report"]) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }

    if (isRecord(value) && Array.isArray(value.rows)) {
      return value.rows.filter(isRecord);
    }
  }

  return [];
}

function readString(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function readNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const parsed = typeof value === "number" ? value : Number(value ?? 0);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function readInteger(row: Record<string, unknown>, keys: string[]) {
  return Math.trunc(readNumber(row, keys));
}

function parseReportDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeBearerToken(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

function getPayloadError(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  const error = payload.error;

  if (typeof error === "string") {
    return error;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
