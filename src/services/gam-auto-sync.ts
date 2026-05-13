import type { Prisma } from "@prisma/client";

import { decryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const activeViewReportBaseUrl = "https://external-api.activeview.app/report";
const syncDebounceMs = 15 * 60 * 1000;
const defaultSyncLookbackDays = 7;
const payloadSampleLength = 1600;
const defaultKvpKey = "utm_campaign";

const revenueFieldCandidates = [
  "revenue",
  "estimated_revenue",
  "gross_revenue",
  "net_revenue",
  "earnings",
] as const;

const grossRevenueFieldCandidates = [
  "gross_revenue",
  "revenueGross",
  "grossRevenue",
  ...revenueFieldCandidates,
] as const;

const netRevenueFieldCandidates = [
  "net_revenue",
  "revenueNet",
  "netRevenue",
  ...revenueFieldCandidates,
] as const;

type SyncGamRevenueParams = {
  dateFrom?: Date;
  dateTo?: Date;
  force?: boolean;
  projectId?: string;
  userId: string;
};

type ConnectionSyncResult = {
  apiPayloadSample: string;
  apiResponseSize: number;
  connectionId: string;
  domain: string;
  durationMs: number;
  networkCode: string;
  kvpKey: string;
  projectId: string;
  rowsInserted: number;
  rowsReceived: number;
  revenueTotal: number;
  campaignsMatched: number;
  skipped: boolean;
  status: "success" | "error";
  url: string | null;
  message: string;
};

export type SyncGamRevenueSummary = {
  connections: ConnectionSyncResult[];
  durationMs: number;
  rows: number;
  rowsReceived: number;
  skipped: number;
  synced: number;
  syncSince: string;
  syncUntil: string;
  warning?: string;
};

type ActiveViewFetchResult = {
  attemptedDomain: string;
  headers: Record<string, string>;
  json: unknown;
  payloadSample: string;
  rawResponse: string;
  responseRows: Record<string, unknown>[];
  status: number;
  url: string;
};

type NormalizedGamRevenueRow = {
  adUnit: string;
  country: string;
  date: Date;
  domain: string;
  networkCode: string;
  kvpKey: string;
  kvpValue: string;
  requestUri: string;
  utmSource: string;
  impressions: number;
  ecpm: number;
  matchRate: number;
  responsesServed: number;
  revenueGross: number;
  revenueNet: number;
  rawJson: Prisma.InputJsonValue;
};

export async function syncGamRevenue({
  dateFrom,
  dateTo,
  force = false,
  projectId,
  userId,
}: SyncGamRevenueParams): Promise<SyncGamRevenueSummary> {
  const startedAt = Date.now();
  const now = new Date();
  const debounceCutoff = new Date(now.getTime() - syncDebounceMs);
  const syncDateTo = endOfUtcDay(dateTo ?? now);
  const syncDateFrom = startOfUtcDay(
    dateFrom ?? subtractDays(now, defaultSyncLookbackDays),
  );
  const connections = await prisma.gamConnection.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      ...(force
        ? {}
        : {
            OR: [
              { lastSyncedAt: null },
              { lastSyncedAt: { lt: debounceCutoff } },
            ],
          }),
    },
    select: {
      authToken: true,
      domain: true,
      id: true,
      lastSyncedAt: true,
      networkCode: true,
      kvpKey: true,
      projectId: true,
    },
  });
  const skipped = force
    ? 0
    : await prisma.gamConnection.count({
        where: {
          userId,
          ...(projectId ? { projectId } : {}),
          lastSyncedAt: {
            gte: debounceCutoff,
          },
        },
      });
  const results: ConnectionSyncResult[] = [];

  console.info("[GAM Sync] sync started", {
    connectionCount: connections.length,
    endDate: toDateInputValue(syncDateTo),
    force,
    projectId,
    skippedByDebounce: skipped,
    startDate: toDateInputValue(syncDateFrom),
    userId,
  });

  for (const connection of connections) {
    const connectionStartedAt = Date.now();
    const syncLog = await prisma.syncLog.create({
      data: {
        userId,
        projectId: connection.projectId,
        source: "ACTIVEVIEW",
        status: "RUNNING",
        message: "Sincronização robusta GAM / ActiveView iniciada.",
      },
      select: {
        id: true,
      },
    });

    try {
      const bearerToken = normalizeBearerToken(
        decryptToken(connection.authToken),
      );
      const fetchResult = await fetchActiveViewReport({
        bearerToken,
        dateFrom: syncDateFrom,
        dateTo: syncDateTo,
        domain: normalizeActiveViewDomain(connection.domain),
        networkCode: connection.networkCode,
        kvpKey: connection.kvpKey,
      });
      const durationMs = Date.now() - connectionStartedAt;

      const normalizedRows = fetchResult.responseRows.map((row) =>
        normalizeGamRevenueRow(row, {
          dateFrom: syncDateFrom,
          domain: fetchResult.attemptedDomain,
          networkCode: connection.networkCode,
          kvpKey: connection.kvpKey,
        }),
      );
      const rowsInserted = await persistGamRevenueRows({
        connectionId: connection.id,
        dateFrom: syncDateFrom,
        dateTo: syncDateTo,
        projectId: connection.projectId,
        rows: normalizedRows,
        userId,
      });

      await prisma.gamConnection.update({
        where: {
          id: connection.id,
        },
        data: {
          lastSyncedAt: new Date(),
        },
      });
      await prisma.syncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: "SUCCESS",
          message: buildSyncLogMessage({
            apiPayloadSample: fetchResult.payloadSample,
            durationMs,
            httpStatus: fetchResult.status,
            kvpKey: connection.kvpKey,
            rowsInserted,
            rowsReceived: fetchResult.responseRows.length,
            url: fetchResult.url,
          }),
          finishedAt: new Date(),
        },
      });

      console.info("[GAM Sync] sync finished", {
        apiPayloadSample: fetchResult.payloadSample,
        apiResponseSize: fetchResult.rawResponse.length,
        connectionId: connection.id,
        domain: fetchResult.attemptedDomain,
        durationMs,
        networkCode: connection.networkCode,
        kvpKey: connection.kvpKey,
        rowsInserted,
        rowsReceived: fetchResult.responseRows.length,
        url: fetchResult.url,
      });

      results.push({
        apiPayloadSample: fetchResult.payloadSample,
        apiResponseSize: fetchResult.rawResponse.length,
        connectionId: connection.id,
        domain: fetchResult.attemptedDomain,
        durationMs,
        networkCode: connection.networkCode,
        kvpKey: connection.kvpKey,
        projectId: connection.projectId,
        rowsInserted,
        rowsReceived: fetchResult.responseRows.length,
        revenueTotal: normalizedRows.reduce(
          (total, row) => total + row.revenueNet,
          0,
        ),
        campaignsMatched: countMatchedCampaigns(normalizedRows),
        skipped: false,
        status: "success",
        url: fetchResult.url,
        message:
          fetchResult.responseRows.length > 0
            ? "Receita sincronizada com sucesso."
            : "Response ActiveView vazio. Receitas antigas foram mantidas.",
      });
    } catch (error) {
      const durationMs = Date.now() - connectionStartedAt;
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível sincronizar GAM / ActiveView.";

      await prisma.syncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: "ERROR",
          message: `${message} Duração: ${durationMs}ms.`,
          finishedAt: new Date(),
        },
      });

      console.error("[GAM Sync] sync failed", {
        connectionId: connection.id,
        domain: connection.domain,
        durationMs,
        message,
        networkCode: connection.networkCode,
        kvpKey: connection.kvpKey,
      });

      results.push({
        apiPayloadSample: "",
        apiResponseSize: 0,
        connectionId: connection.id,
        domain: connection.domain,
        durationMs,
        networkCode: connection.networkCode,
        kvpKey: connection.kvpKey,
        projectId: connection.projectId,
        rowsInserted: 0,
        rowsReceived: 0,
        revenueTotal: 0,
        campaignsMatched: 0,
        skipped: false,
        status: "error",
        url: null,
        message,
      });
    }
  }

  const rows = results.reduce(
    (total, result) => total + result.rowsInserted,
    0,
  );
  const rowsReceived = results.reduce(
    (total, result) => total + result.rowsReceived,
    0,
  );
  const errors = results.filter((result) => result.status === "error").length;
  const durationMs = Date.now() - startedAt;

  console.info("[GAM Sync] sync finished", {
    durationMs,
    errors,
    rowsInserted: rows,
    rowsReceived,
    skippedByDebounce: skipped,
    syncedConnections: results.length,
    userId,
  });

  return {
    connections: results,
    durationMs,
    rows,
    rowsReceived,
    skipped,
    synced: results.length,
    syncSince: toDateInputValue(syncDateFrom),
    syncUntil: toDateInputValue(syncDateTo),
    warning: getSyncWarning({
      errors,
      rows,
      rowsReceived,
      synced: results.length,
    }),
  };
}

async function fetchActiveViewReport({
  bearerToken,
  dateFrom,
  dateTo,
  domain,
  kvpKey,
  networkCode,
}: {
  bearerToken: string;
  dateFrom: Date;
  dateTo: Date;
  domain: string;
  kvpKey?: string | null;
  networkCode: string;
}): Promise<ActiveViewFetchResult> {
  const normalizedKvpKey = normalizeKvpKey(kvpKey);
  const url = buildReportUrl({
    dateFrom,
    dateTo,
    domain,
    kvpKey: normalizedKvpKey,
    networkCode,
  });
  console.log("[ACTIVEVIEW REQUEST]", {
    url,
    networkCode,
    domain,
    key: normalizedKvpKey,
    start_date: toDateInputValue(dateFrom),
    end_date: toDateInputValue(dateTo),
    authorization: "Bearer ***",
  });

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: bearerToken,
    },
  });
  const rawResponse = await response.text();
  const json = parseJsonPayload(rawResponse);
  const headers = Object.fromEntries(response.headers.entries());
  const responseRows = getResponseRows(json);
  const result = {
    attemptedDomain: domain,
    headers,
    json,
    payloadSample: getPayloadSample(rawResponse),
    rawResponse,
    responseRows,
    status: response.status,
    url,
  };

  console.log("[ACTIVEVIEW RESPONSE]", {
    status: response.status,
    rawResponse,
    rowsCount: responseRows.length,
  });

  console.info("[KVP SYNC]", {
    endpoint: url,
    key: normalizedKvpKey,
    rows: responseRows.length,
    sample: getPayloadSample(rawResponse),
  });

  console.info("[GAM Sync] ActiveView full response", {
    headers,
    httpStatus: response.status,
    payload: rawResponse,
    url,
  });

  if (!response.ok) {
    throw new Error(`ActiveView retornou HTTP ${response.status}.`);
  }

  return result;
}

async function persistGamRevenueRows({
  connectionId,
  dateFrom,
  dateTo,
  projectId,
  rows,
  userId,
}: {
  connectionId: string;
  dateFrom: Date;
  dateTo: Date;
  projectId: string;
  rows: NormalizedGamRevenueRow[];
  userId: string;
}) {
  if (rows.length === 0) {
    return 0;
  }

  const domains = Array.from(new Set(rows.map((row) => row.domain)));
  const networkCodes = Array.from(new Set(rows.map((row) => row.networkCode)));

  await prisma.gamRevenueRow.deleteMany({
    where: {
      userId,
      projectId,
      gamConnectionId: connectionId,
      domain: {
        in: domains,
      },
      networkCode: {
        in: networkCodes,
      },
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
    },
  });

  const createResult = await prisma.gamRevenueRow.createMany({
    data: rows.map((row) => ({
      userId,
      projectId,
      gamConnectionId: connectionId,
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
      ecpm: row.ecpm,
      matchRate: row.matchRate,
      responsesServed: row.responsesServed,
      revenueGross: row.revenueGross,
      revenueNet: row.revenueNet,
      rawJson: row.rawJson,
    })),
  });

  await upsertDailyRevenue({ projectId, rows, userId });

  return createResult.count;
}

async function upsertDailyRevenue({
  projectId,
  rows,
  userId,
}: {
  projectId: string;
  rows: NormalizedGamRevenueRow[];
  userId: string;
}) {
  const dailyRevenue = new Map<
    string,
    {
      date: Date;
      domain: string;
      networkCode: string;
      revenue: number;
    }
  >();

  for (const row of rows) {
    const dailyKey = [row.date.toISOString(), row.domain, row.networkCode].join(
      "|",
    );
    const current = dailyRevenue.get(dailyKey);

    dailyRevenue.set(dailyKey, {
      date: row.date,
      domain: row.domain,
      networkCode: row.networkCode,
      revenue: (current?.revenue ?? 0) + row.revenueNet,
    });
  }

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
}

function normalizeGamRevenueRow(
  row: Record<string, unknown>,
  fallback: {
    dateFrom: Date;
    domain: string;
    networkCode: string;
    kvpKey?: string | null;
  },
): NormalizedGamRevenueRow {
  const kvpKey = normalizeKvpKey(fallback.kvpKey);
  const netRevenue = readNumber(row, [...netRevenueFieldCandidates]);
  const grossRevenue = readNumber(row, [...grossRevenueFieldCandidates]);

  return {
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
      readString(row, ["country", "country_code", "countryCode", "geo"]) ?? "",
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
    kvpKey,
    kvpValue: readString(row, [kvpKey]) ?? "",
    requestUri:
      readString(row, ["request_uri", "requestUri", "uri", "url"]) ?? "",
    utmSource: readString(row, ["utm_source", "utmSource", "source"]) ?? "",
    impressions: readInteger(row, ["impressions", "ad_impressions", "views"]),
    ecpm: readNumber(row, ["ecpm", "eCPM", "rpm"]),
    matchRate: readNumber(row, ["match_rate", "matchRate"]),
    responsesServed: readInteger(row, ["responses_served", "responsesServed"]),
    revenueGross: grossRevenue || netRevenue,
    revenueNet: netRevenue || grossRevenue,
    rawJson: row as Prisma.InputJsonValue,
  };
}

function buildReportUrl({
  dateFrom,
  dateTo,
  domain,
  kvpKey,
  networkCode,
}: {
  dateFrom: Date;
  dateTo: Date;
  domain: string;
  kvpKey: string;
  networkCode: string;
}) {
  const url = new URL(
    `${activeViewReportBaseUrl}/kvp/${encodeURIComponent(
      networkCode,
    )}/${encodeURIComponent(domain)}`,
  );

  url.searchParams.set("start_date", toDateInputValue(dateFrom));
  url.searchParams.set("end_date", toDateInputValue(dateTo));
  url.searchParams.set("key", kvpKey);

  return url.toString();
}

function buildSyncLogMessage({
  apiPayloadSample,
  durationMs,
  httpStatus,
  kvpKey,
  rowsInserted,
  rowsReceived,
  url,
}: {
  apiPayloadSample: string;
  durationMs: number;
  httpStatus: number;
  kvpKey: string;
  rowsInserted: number;
  rowsReceived: number;
  url: string;
}) {
  return [
    `KVP key: ${kvpKey}.`,
    `Rows received: ${rowsReceived}.`,
    `Rows inserted: ${rowsInserted}.`,
    `Sync duration: ${durationMs}ms.`,
    `HTTP status: ${httpStatus}.`,
    `URL: ${url}.`,
    `API payload sample: ${apiPayloadSample || "Resposta vazia"}.`,
  ].join(" ");
}

function normalizeActiveViewDomain(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function getPayloadSample(rawResponse: string) {
  return rawResponse.length > payloadSampleLength
    ? `${rawResponse.slice(0, payloadSampleLength)}...`
    : rawResponse;
}

function getResponseRows(payload: unknown) {
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

function readInteger(row: Record<string, unknown>, keys: string[]) {
  return Math.trunc(readNumber(row, keys));
}

function readNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const parsed = parseRevenueValue(value);

    if (parsed !== null) {
      return parsed;
    }
  }

  return 0;
}

function parseRevenueValue(value: unknown) {
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

function parseReportDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function normalizeKvpKey(kvpKey?: string | null) {
  return kvpKey?.trim() || defaultKvpKey;
}

function countMatchedCampaigns(rows: NormalizedGamRevenueRow[]) {
  return new Set(
    rows
      .map((row) => row.kvpValue)
      .filter((value): value is string => Boolean(value)),
  ).size;
}

function normalizeBearerToken(token: string) {
  const pureToken = token.replace(/^Bearer\s+/i, "").trim();

  return `Bearer ${pureToken}`;
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - days);

  return result;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getSyncWarning({
  errors,
  rows,
  rowsReceived,
  synced,
}: {
  errors: number;
  rows: number;
  rowsReceived: number;
  synced: number;
}) {
  if (errors > 0) {
    return "Algumas conexões não sincronizaram. Receitas antigas foram mantidas.";
  }

  if (synced > 0 && rowsReceived === 0 && rows === 0) {
    return "Response ActiveView vazio. Receitas antigas foram mantidas.";
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
