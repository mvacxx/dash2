import { NextResponse, type NextRequest } from "next/server";

import { activeViewRevenueSchema } from "@/lib/active-view-revenue-validation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = activeViewRevenueSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: parsedBody.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const [project, gamConnection] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: parsedBody.data.projectId,
        userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.gamConnection.findFirst({
      where: {
        id: parsedBody.data.gamConnectionId,
        projectId: parsedBody.data.projectId,
        userId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!project) {
    return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
  }

  if (!gamConnection) {
    return NextResponse.json({ message: "Conexão GAM não encontrada para este projeto." }, { status: 404 });
  }

  const existingRevenue = await prisma.activeViewRevenue.findFirst({
    where: {
      projectId: parsedBody.data.projectId,
      gamConnectionId: parsedBody.data.gamConnectionId,
      date: parsedBody.data.date,
      domain: parsedBody.data.domain,
      campaignKey: parsedBody.data.campaignKey ?? null,
      adKey: parsedBody.data.adKey ?? null,
      userId,
    },
    select: {
      id: true,
    },
  });

  const include = {
    project: {
      select: {
        id: true,
        name: true,
        domain: true,
      },
    },
    gamConnection: {
      select: {
        id: true,
        networkCode: true,
        domain: true,
      },
    },
  } as const;

  const revenue = existingRevenue
    ? await prisma.activeViewRevenue.update({
        where: {
          id: existingRevenue.id,
        },
        data: parsedBody.data,
        include,
      })
    : await prisma.activeViewRevenue.create({
        data: {
          ...parsedBody.data,
          userId,
        },
        include,
      });

  return NextResponse.json({ revenue }, { status: 201 });
}
