import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const metaAccountId = searchParams.get("metaAccountId") ?? undefined;

  const insights = await prisma.metaInsight.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      ...(metaAccountId ? { metaAccountId } : {}),
    },
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
    orderBy: [
      {
        date: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return NextResponse.json({ insights });
}
