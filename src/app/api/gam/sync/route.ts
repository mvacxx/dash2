import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { syncActiveViewRevenue } from "@/lib/activeview";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value: string | undefined) => (value ? value : undefined));

const syncGamSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  gamConnectionId: z.string().min(1, "Selecione uma conexão GAM."),
  dateFrom: z.coerce.date({
    invalid_type_error: "Informe uma data inicial válida.",
  }),
  dateTo: z.coerce.date({
    invalid_type_error: "Informe uma data final válida.",
  }),
  domain: optionalString,
  networkCode: optionalString,
  fieldOne: optionalString,
  valueOne: optionalString,
  fieldTwo: optionalString,
  valueTwo: optionalString,
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
      domain: parsedBody.data.domain,
      networkCode: parsedBody.data.networkCode,
      fieldOne: parsedBody.data.fieldOne,
      valueOne: parsedBody.data.valueOne,
      fieldTwo: parsedBody.data.fieldTwo,
      valueTwo: parsedBody.data.valueTwo,
    });
    const message = `Sincronização GAM / ActiveView concluída com ${result.count} receita(s).`;

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

    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível sincronizar o relatório GAM.";

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
      { message },
      {
        status: message.startsWith("Configure API base URL") ? 400 : 502,
      },
    );
  }
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
