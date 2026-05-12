import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { syncGamRevenue } from "@/services/gam-auto-sync";

const triggerSyncSchema = z
  .object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    force: z.boolean().optional().default(true),
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

  const { dateFrom, dateTo, force } = parsedBody.data ?? { force: true };

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json(
      { message: "A data inicial não pode ser maior que a data final." },
      { status: 400 },
    );
  }

  const result = await syncGamRevenue({
    dateFrom,
    dateTo,
    force,
    userId,
  });

  return NextResponse.json({ result });
}
