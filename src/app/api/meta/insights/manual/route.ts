import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { metaInsightSchema } from "@/lib/meta-insight-validation";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = metaInsightSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: parsedBody.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const [project, metaAccount] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: parsedBody.data.projectId,
        userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.metaAccount.findFirst({
      where: {
        id: parsedBody.data.metaAccountId,
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

  if (!metaAccount) {
    return NextResponse.json({ message: "Conta Meta Ads não encontrada para este projeto." }, { status: 404 });
  }

  const insight = await prisma.metaInsight.upsert({
    where: {
      projectId_metaAccountId_campaignId_date_level: {
        projectId: parsedBody.data.projectId,
        metaAccountId: parsedBody.data.metaAccountId,
        campaignId: parsedBody.data.campaignId,
        date: parsedBody.data.date,
        level: parsedBody.data.level,
      },
    },
    create: {
      ...parsedBody.data,
      userId,
    },
    update: parsedBody.data,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
      metaAccount: {
        select: {
          id: true,
          label: true,
          adAccountId: true,
        },
      },
    },
  });

  return NextResponse.json({ insight }, { status: 201 });
}
