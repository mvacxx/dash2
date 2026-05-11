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
  const gamConnectionId = searchParams.get("gamConnectionId") ?? undefined;

  const revenue = await prisma.activeViewRevenue.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      ...(gamConnectionId ? { gamConnectionId } : {}),
    },
    include: {
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

  return NextResponse.json({ revenue });
}
