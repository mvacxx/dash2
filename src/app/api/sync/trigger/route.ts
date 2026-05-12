import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGamRevenue } from "@/services/gam-auto-sync";

const triggerSyncSchema = z
  .object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    force: z.boolean().optional().default(true),
    projectId: z.string().min(1).optional(),
  })
  .optional();

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => undefined);
  const parsedBody = triggerSyncSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: parsedBody.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const { dateFrom, dateTo, force, projectId } = parsedBody.data ?? {
    force: true,
  };

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json(
      { message: "A data inicial não pode ser maior que a data final." },
      { status: 400 },
    );
  }

  const connectionsCount = await prisma.gamConnection.count({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
    },
  });

  console.log("[SYNC TRIGGER]", {
    projectId,
    dateFrom: dateFrom ? toDateInputValue(dateFrom) : undefined,
    dateTo: dateTo ? toDateInputValue(dateTo) : undefined,
    connectionsCount,
  });

  const result = await syncGamRevenue({
    dateFrom,
    dateTo,
    force,
    projectId,
    userId,
  });

  return NextResponse.json({
    ok: true,
    accounts: result.synced,
    rows: result.rows,
    syncSince: result.syncSince,
    syncUntil: result.syncUntil,
    message:
      result.warning ??
      (result.rows === 0
        ? "Nenhuma receita encontrada para o período."
        : "Sincronização concluída com sucesso."),
    result,
  });
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
