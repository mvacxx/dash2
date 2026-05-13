import type { Prisma } from "@prisma/client";

import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const activeViewReportBaseUrl = "https://external-api.activeview.app/report";
const defaultKvpKey = "utm_campaign";

type ActiveViewReportParams = {
  authToken: string;
  dateFrom: Date;
  dateTo: Date;
  domain: string;
  networkCode: string;
  kvpKey?: string;
};

export type ActiveViewSyncDebug = {
  url: string;
  domain: string;
  networkCode: string;
  startDate: string;
  endDate: string;
  authorization: "Bearer ***";
  httpStatus: number | null;
  rawResponse: string;
  rawResponseSummary: string;
  rowCount: number;
  key: string;
  revenueTotal: number;
  campaignsMatched: number;
};

class ActiveViewSyncError extends Error {
  debug: ActiveViewSyncDebug;

  constructor(message: string, debug: ActiveViewSyncDebug) {
    super(message);
    this.name = "ActiveViewSyncError";
    this.debug = debug;
  }
}

export function getActiveViewSyncErrorDebug(error: unknown) {
  return error instanceof ActiveViewSyncError ? error.debug : null;
}

type SyncActiveViewRevenueParams = {
  userId: string;
  projectId: string;
  gamConnectionId: string;
  dateFrom: Date;
  dateTo: Date;
};

export type NormalizedActiveViewRevenue = {
  date: Date;
  domain: string;
  networkCode: string;
  source?: string;
  campaignKey?: string;
  adUnit: string;
  country: string;
  kvpKey: string;
  kvpValue: string;
  requestUri: string;
  utmSource: string;
  impressions: number;
  clicks: number;
  ctr: number;
  ecpm: number;
  matchRate: number;
  responsesServed: number;
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
  message: string;
  debug: ActiveViewSyncDebug;
};

export async function getActiveViewReport(params: ActiveViewReportParams) {
  const url = buildReportUrl(params);
  const token = normalizeBearerToken(params.authToken);
  const startDate = toDateInputValue(params.dateFrom);
  const endDate = toDateInputValue(params.dateTo);
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: token,
    },
  });
  const rawResponse = await response.text();
  const payload = parseJsonPayload(rawResponse);
  const debug: ActiveViewSyncDebug = {
    url,
    domain: params.domain,
    networkCode: params.networkCode,
    startDate,
    endDate,
    authorization: "Bearer ***",
    httpStatus: response.status,
    rawResponse,
    rawResponseSummary: summarizeRawResponse(rawResponse),
    rowCount: 0,
    key: normalizeKvpKey(params.kvpKey),
    revenueTotal: 0,
    campaignsMatched: 0,
  };

  if (!response.ok) {
    throw new ActiveViewSyncError(
      getPayloadError(payload) ??
        "Não foi possível buscar o relatório ActiveView/GAM.",
      debug,
    );
  }

  return {
    payload,
    debug,
  };
}

export function normalizeActiveViewResponse(
  payload: unknown,
  fallback: {
    dateFrom: Date;
    domain: string;
    networkCode: string;
    kvpKey?: string | null;
  },
): NormalizedActiveViewRevenue[] {
  const kvpKey = normalizeKvpKey(fallback.kvpKey);

  return extractRows(payload).map((row) => {
    const trackingKey = readString(row, ["key"]) ?? kvpKey;
    const trackingValue =
      readString(row, ["value"]) ?? readString(row, [trackingKey]) ?? "";
    const revenueRaw = readOptionalNumber(row, [
      "ad_exchange_line_item_level_revenue",
    ]);
    const revenue =
      revenueRaw !== null
        ? revenueRaw / 1_000_000
        : readNumber(row, [
            "revenueNet",
            "revenue_net",
            "netRevenue",
            "net_revenue",
            "net",
            "revenue",
          ]);

    return {
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
      adUnit:
        readString(row, [
          "adUnit",
          "ad_unit",
          "adunit",
          "ad_unit_name",
          "adUnitName",
          "ad_unit_id",
          "adUnitId",
        ]) ?? "",
      country:
        readString(row, ["country", "country_code", "countryCode", "geo"]) ??
        "",
      kvpKey: trackingKey,
      kvpValue: trackingValue,
      requestUri:
        readString(row, ["request_uri", "requestUri", "uri", "url"]) ?? "",
      utmSource: readString(row, ["utm_source", "utmSource", "source"]) ?? "",
      impressions: readInteger(row, [
        "ad_exchange_line_item_level_impressions",
        "impressions",
        "ad_impressions",
        "views",
      ]),
      clicks: readInteger(row, [
        "ad_exchange_line_item_level_clicks",
        "clicks",
      ]),
      ctr: readNumber(row, ["ad_exchange_line_item_level_ctr", "ctr"]),
      ecpm: readNumber(row, ["ecpm", "eCPM", "rpm"]),
      matchRate: readNumber(row, ["match_rate", "matchRate"]),
      responsesServed: readInteger(row, [
        "ad_exchange_responses_served",
        "responses_served",
        "responsesServed",
      ]),
      campaignKey:
        trackingKey === "utm_campaign"
          ? trackingValue
          : readString(row, [
              "campaignKey",
              "campaign_key",
              "campaign",
              "campaign_id",
              "utm_campaign",
            ]),
      adKey:
        trackingKey === "ad_id"
          ? trackingValue
          : readString(row, [
              "adKey",
              "ad_key",
              "ad",
              "ad_id",
              "creative_id",
              "utm_content",
            ]),
      revenueGross: revenue,
      revenueNet: revenue,
      views: readInteger(row, [
        "ad_exchange_line_item_level_impressions",
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
    };
  });
}

export async function syncActiveViewRevenue({
  dateFrom,
  dateTo,
  gamConnectionId,
  projectId,
  userId,
}: SyncActiveViewRevenueParams): Promise<SyncActiveViewRevenueResult> {
  const connection = await prisma.gamConnection.findFirst({
    where: {
      id: gamConnectionId,
      projectId,
      userId,
    },
    select: {
      authToken: true,
      domain: true,
      networkCode: true,
      kvpKey: true,
    },
  });

  if (!connection) {
    throw new Error("Conexão GAM não encontrada para este projeto.");
  }

  const { debug, payload } = await getActiveViewReport({
    authToken: decryptToken(connection.authToken),
    dateFrom,
    dateTo,
    domain: normalizeActiveViewDomain(connection.domain),
    networkCode: connection.networkCode,
    kvpKey: connection.kvpKey,
  });
  const revenueRows = normalizeActiveViewResponse(payload, {
    dateFrom,
    domain: normalizeActiveViewDomain(connection.domain),
    networkCode: connection.networkCode,
    kvpKey: connection.kvpKey,
  });
  logKvpParser({ payload, rows: revenueRows });

  const dailyRevenue = new Map<
    string,
    NormalizedActiveViewRevenue & { revenue: number }
  >();
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
      rawJson: row.rawJson as Prisma.InputJsonValue,
    };

    const dailyKey = [row.date.toISOString(), row.domain, row.networkCode].join(
      "|",
    );
    const currentDailyRevenue = dailyRevenue.get(dailyKey);

    dailyRevenue.set(dailyKey, {
      ...row,
      revenue: (currentDailyRevenue?.revenue ?? 0) + row.revenueNet,
    });

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

  await persistGamRevenueRows({
    dateFrom,
    dateTo,
    gamConnectionId,
    projectId,
    rows: revenueRows,
    userId,
  });

  for (const row of dailyRevenue.values()) {
    await prisma.gamRevenueDaily.upsert({
      where: {
        userId_projectId_date_domain_networkCode: {
          userId,
          projectId,
          date: row.date,
          domain: row.domain,
          networkCode: row.networkCode,
        },
      },
      update: {
        revenue: row.revenue,
      },
      create: {
        userId,
        projectId,
        date: row.date,
        revenue: row.revenue,
        domain: row.domain,
        networkCode: row.networkCode,
      },
    });
  }

  return {
    count,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    message:
      count > 0
        ? "Receita sincronizada com sucesso"
        : "Nenhuma receita encontrada para o período",
    debug: {
      ...debug,
      rowCount: count,
      revenueTotal: revenueRows.reduce(
        (total, row) => total + row.revenueNet,
        0,
      ),
      campaignsMatched: countMatchedCampaigns(revenueRows),
    },
  };
}

async function persistGamRevenueRows({
  dateFrom,
  dateTo,
  gamConnectionId,
  projectId,
  rows,
  userId,
}: {
  dateFrom: Date;
  dateTo: Date;
  gamConnectionId: string;
  projectId: string;
  rows: NormalizedActiveViewRevenue[];
  userId: string;
}) {
  await prisma.gamRevenueRow.deleteMany({
    where: {
      userId,
      projectId,
      gamConnectionId,
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
  });

  if (rows.length === 0) {
    return;
  }

  await prisma.gamRevenueRow.createMany({
    data: rows.map((row) => ({
      userId,
      projectId,
      gamConnectionId,
      networkCode: row.networkCode,
      domain: row.domain,
      date: row.date,
      adUnit: row.adUnit,
      country: row.country,
      kvpKey: row.kvpKey,
      kvpValue: row.kvpValue,
      requestUri: row.requestUri,
      utmSource: row.utmSource,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      ecpm: row.ecpm,
      matchRate: row.matchRate,
      responsesServed: row.responsesServed,
      revenueGross: row.revenueGross,
      revenueNet: row.revenueNet,
      rawJson: row.rawJson as Prisma.InputJsonValue,
    })),
  });
}

function buildReportUrl({
  dateFrom,
  dateTo,
  domain,
  kvpKey,
  networkCode,
}: ActiveViewReportParams) {
  const normalizedKvpKey = normalizeKvpKey(kvpKey);
  const url = new URL(
    `${activeViewReportBaseUrl}/kvp/${encodeURIComponent(
      networkCode,
    )}/${encodeURIComponent(domain)}`,
  );

  url.searchParams.set("start_date", toDateInputValue(dateFrom));
  url.searchParams.set("end_date", toDateInputValue(dateTo));
  url.searchParams.set("key", normalizedKvpKey);

  return url.toString();
}

function parseJsonPayload(rawResponse: string) {
  if (!rawResponse.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawResponse) as unknown;
  } catch {
    return rawResponse;
  }
}

function summarizeRawResponse(rawResponse: string) {
  const normalizedResponse = rawResponse.trim();

  if (!normalizedResponse) {
    return "Resposta vazia";
  }

  return normalizedResponse.length > 1200
    ? `${normalizedResponse.slice(0, 1200)}...`
    : normalizedResponse;
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of [
    "response",
    "data",
    "rows",
    "results",
    "items",
    "report",
  ]) {
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
  return readOptionalNumber(row, keys) ?? 0;
}

function readOptionalNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const parsed = parseNumericValue(value);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalizedValue = value.replace(/[^0-9,.-]/g, "");
  const decimalNormalizedValue =
    normalizedValue.includes(",") && normalizedValue.includes(".")
      ? normalizedValue.replace(/,/g, "")
      : normalizedValue.replace(/,/g, ".");
  const parsed = Number(decimalNormalizedValue);

  return Number.isFinite(parsed) ? parsed : null;
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

function normalizeActiveViewDomain(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function normalizeKvpKey(kvpKey?: string | null) {
  return kvpKey?.trim() || defaultKvpKey;
}

function countMatchedCampaigns(rows: NormalizedActiveViewRevenue[]) {
  return new Set(
    rows
      .map((row) => row.campaignKey ?? row.adKey)
      .filter((value): value is string => Boolean(value)),
  ).size;
}

function logKvpParser({
  payload,
  rows,
}: {
  payload: unknown;
  rows: NormalizedActiveViewRevenue[];
}) {
  const rawRows = extractRows(payload);
  const sampleRow = rawRows[0];
  const sampleRevenueRaw = sampleRow
    ? readOptionalNumber(sampleRow, ["ad_exchange_line_item_level_revenue"])
    : null;

  console.info("[KVP PARSER]", {
    rowsReceived: rows.length,
    totalRevenue: rows.reduce((total, row) => total + row.revenueNet, 0),
    sampleValue: rows[0]?.kvpValue ?? null,
    sampleRevenueRaw,
    sampleRevenueNormalized:
      sampleRevenueRaw !== null ? sampleRevenueRaw / 1_000_000 : null,
  });
}

function normalizeBearerToken(token: string) {
  const cleanToken = token.replace(/^Bearer\s+/i, "").trim();

  console.log("[ACTIVEVIEW AUTH DEBUG]", {
    tokenLength: cleanToken.length,
    tokenStart: cleanToken.slice(0, 6),
    tokenEnd: cleanToken.slice(-6),
    hasColon: cleanToken.includes(":"),
    authorizationPreview: `Bearer ${cleanToken.slice(0, 6)}...${cleanToken.slice(-6)}`,
  });

  return `Bearer ${cleanToken}`;
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
