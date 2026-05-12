import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  getActiveViewSyncErrorDebug,
  syncActiveViewRevenue,
  type ActiveViewSyncDebug,
} from "@/lib/activeview";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const syncGamSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  gamConnectionId: z.string().min(1, "Selecione uma conexão GAM."),
  dateFrom: z.coerce.date({
    invalid_type_error: "Informe uma data inicial válida.",
  }),
  dateTo: z.coerce.date({
    invalid_type_error: "Informe uma data final válida.",
  }),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = syncGamSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: parsedBody.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  if (parsedBody.data.dateFrom > parsedBody.data.dateTo) {
    return NextResponse.json(
      { message: "A data inicial não pode ser maior que a data final." },
      { status: 400 },
    );
  }

  const connection = await prisma.gamConnection.findFirst({
    where: {
      id: parsedBody.data.gamConnectionId,
      projectId: parsedBody.data.projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    return NextResponse.json(
      { message: "Conexão GAM não encontrada para este projeto." },
      { status: 404 },
    );
  }

  const syncLog = await prisma.syncLog.create({
    data: {
      userId,
      projectId: parsedBody.data.projectId,
      source: "ACTIVEVIEW",
      status: "RUNNING",
      message: "Sincronização GAM / ActiveView iniciada.",
    },
    select: {
      id: true,
    },
  });

  try {
    const result = await syncActiveViewRevenue({
      userId,
      projectId: parsedBody.data.projectId,
      gamConnectionId: parsedBody.data.gamConnectionId,
      dateFrom: startOfUtcDay(parsedBody.data.dateFrom),
      dateTo: endOfUtcDay(parsedBody.data.dateTo),
    });
    const message = result.message;
    logActiveViewSyncDebug(result.debug);
    const safeDebug = toSafeDebug(result.debug);

    await prisma.syncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "SUCCESS",
        message,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      result: {
        ...result,
        debug: safeDebug,
      },
    });
  } catch (error) {
    const debug = getActiveViewSyncErrorDebug(error);
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível sincronizar o relatório GAM.";

    if (debug) {
      logActiveViewSyncDebug(debug);
    }

    await prisma.syncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "ERROR",
        message,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message, ...(debug ? { debug: toSafeDebug(debug) } : {}) },
      { status: 502 },
    );
  }
}

function logActiveViewSyncDebug(debug: ActiveViewSyncDebug) {
  console.info("[GAM Sync] ActiveView request", {
    url: debug.url,
    domain: debug.domain,
    networkCode: debug.networkCode,
    start_date: debug.startDate,
    end_date: debug.endDate,
    authorization: debug.authorization,
    httpStatus: debug.httpStatus,
    rawResponse: debug.rawResponse,
  });
}

function toSafeDebug(debug: ActiveViewSyncDebug) {
  const { rawResponse: _rawResponse, ...safeDebug } = debug;

  return safeDebug;
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
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
