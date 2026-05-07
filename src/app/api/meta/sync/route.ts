import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncMetaInsights } from "@/lib/meta";

const syncMetaSchema = z.object({
  projectId: z.string().min(1, "Selecione um projeto."),
  metaAccountId: z.string().min(1, "Selecione uma conta Meta Ads."),
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
  const parsedBody = syncMetaSchema.safeParse(body);

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

  const metaAccount = await prisma.metaAccount.findFirst({
    where: {
      id: parsedBody.data.metaAccountId,
      projectId: parsedBody.data.projectId,
      userId,
    },
    select: {
      id: true,
      connectionType: true,
    },
  });

  if (!metaAccount) {
    return NextResponse.json(
      { message: "Conta Meta Ads não encontrada para este projeto." },
      { status: 404 },
    );
  }

  if (metaAccount.connectionType !== "META_API") {
    return NextResponse.json(
      { message: "Esta conta está configurada como manual." },
      { status: 400 },
    );
  }

  try {
    const result = await syncMetaInsights({
      userId,
      projectId: parsedBody.data.projectId,
      metaAccountId: parsedBody.data.metaAccountId,
      dateFrom: startOfUtcDay(parsedBody.data.dateFrom),
      dateTo: endOfUtcDay(parsedBody.data.dateTo),
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível sincronizar a Meta Ads API.",
      },
      { status: 502 },
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
