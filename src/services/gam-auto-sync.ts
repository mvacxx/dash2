import {
  getActiveViewSyncErrorDebug,
  syncActiveViewRevenue,
} from "@/lib/activeview";
import { prisma } from "@/lib/prisma";

const syncDebounceMs = 15 * 60 * 1000;
const defaultSyncLookbackDays = 7;

type SyncGamRevenueParams = {
  force?: boolean;
  userId: string;
};

type ConnectionSyncResult = {
  apiResponseSize: number;
  connectionId: string;
  domain: string;
  durationMs: number;
  networkCode: string;
  projectId: string;
  rows: number;
  skipped: boolean;
  status: "success" | "error";
  message: string;
};

export type SyncGamRevenueSummary = {
  connections: ConnectionSyncResult[];
  durationMs: number;
  rows: number;
  skipped: number;
  synced: number;
  warning?: string;
};

export async function syncGamRevenue({
  force = false,
  userId,
}: SyncGamRevenueParams): Promise<SyncGamRevenueSummary> {
  const startedAt = Date.now();
  const now = new Date();
  const debounceCutoff = new Date(now.getTime() - syncDebounceMs);
  const dateTo = endOfUtcDay(now);
  const dateFrom = startOfUtcDay(subtractDays(now, defaultSyncLookbackDays));
  const connections = await prisma.gamConnection.findMany({
    where: {
      userId,
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
      domain: true,
      id: true,
      lastSyncedAt: true,
      networkCode: true,
      projectId: true,
    },
  });
  const skipped = force
    ? 0
    : await prisma.gamConnection.count({
        where: {
          userId,
          lastSyncedAt: {
            gte: debounceCutoff,
          },
        },
      });
  const results: ConnectionSyncResult[] = [];

  console.info("[GAM Auto Sync] sync started", {
    connectionCount: connections.length,
    dateFrom: toDateInputValue(dateFrom),
    dateTo: toDateInputValue(dateTo),
    force,
    skippedByDebounce: skipped,
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
        message: "Sincronização automática GAM / ActiveView iniciada.",
      },
      select: {
        id: true,
      },
    });

    try {
      const result = await syncActiveViewRevenue({
        userId,
        projectId: connection.projectId,
        gamConnectionId: connection.id,
        dateFrom,
        dateTo,
      });
      const durationMs = Date.now() - connectionStartedAt;
      const apiResponseSize = result.debug.rawResponse.length;

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
          message: [
            result.message,
            `Linhas inseridas/atualizadas: ${result.count}.`,
            `Tamanho da resposta API: ${apiResponseSize} bytes.`,
            `Duração: ${durationMs}ms.`,
          ].join(" "),
          finishedAt: new Date(),
        },
      });

      console.info("[GAM Auto Sync] sync finished", {
        apiResponseSize,
        connectionId: connection.id,
        domain: connection.domain,
        durationMs,
        networkCode: connection.networkCode,
        rowsInserted: result.count,
      });

      results.push({
        apiResponseSize,
        connectionId: connection.id,
        domain: connection.domain,
        durationMs,
        networkCode: connection.networkCode,
        projectId: connection.projectId,
        rows: result.count,
        skipped: false,
        status: "success",
        message: result.message,
      });
    } catch (error) {
      const durationMs = Date.now() - connectionStartedAt;
      const debug = getActiveViewSyncErrorDebug(error);
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível sincronizar GAM / ActiveView.";

      const apiResponseSize = debug?.rawResponse.length ?? 0;

      await prisma.syncLog.update({
        where: {
          id: syncLog.id,
        },
        data: {
          status: "ERROR",
          message: [
            message,
            `Tamanho da resposta API: ${apiResponseSize} bytes.`,
            `Duração: ${durationMs}ms.`,
          ].join(" "),
          finishedAt: new Date(),
        },
      });

      console.error("[GAM Auto Sync] sync failed", {
        apiResponseSize,
        connectionId: connection.id,
        domain: connection.domain,
        durationMs,
        message,
        networkCode: connection.networkCode,
      });

      results.push({
        apiResponseSize,
        connectionId: connection.id,
        domain: connection.domain,
        durationMs,
        networkCode: connection.networkCode,
        projectId: connection.projectId,
        rows: 0,
        skipped: false,
        status: "error",
        message,
      });
    }
  }

  const rows = results.reduce((total, result) => total + result.rows, 0);
  const errors = results.filter((result) => result.status === "error").length;
  const durationMs = Date.now() - startedAt;

  console.info("[GAM Auto Sync] sync finished", {
    durationMs,
    errors,
    rowsInserted: rows,
    skippedByDebounce: skipped,
    syncedConnections: results.length,
    userId,
  });

  return {
    connections: results,
    durationMs,
    rows,
    skipped,
    synced: results.length,
    warning: getSyncWarning({ errors, rows, synced: results.length }),
  };
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
  synced,
}: {
  errors: number;
  rows: number;
  synced: number;
}) {
  if (errors > 0) {
    return "Algumas conexões não sincronizaram. Receitas antigas foram mantidas.";
  }

  if (synced > 0 && rows === 0) {
    return "Nenhuma receita nova encontrada. Receitas antigas foram mantidas.";
  }

  return undefined;
}
