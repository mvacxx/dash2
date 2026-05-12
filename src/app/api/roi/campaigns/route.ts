import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGamRevenue } from "@/services/gam-auto-sync";
import { generateCampaignRoiReport } from "@/services/roi-service";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim();
  const metaAccountId = searchParams.get("metaAccountId")?.trim() || undefined;
  const dateFromParam = searchParams.get("dateFrom")?.trim();
  const dateToParam = searchParams.get("dateTo")?.trim();

  if (!projectId) {
    return NextResponse.json(
      { message: "Informe o projectId." },
      { status: 400 },
    );
  }

  if (!dateFromParam || !dateToParam) {
    return NextResponse.json(
      { message: "Informe dateFrom e dateTo." },
      { status: 400 },
    );
  }

  const dateFrom = parseDateBoundary(dateFromParam, "start");
  const dateTo = parseDateBoundary(dateToParam, "end");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { message: "Informe datas válidas no formato YYYY-MM-DD." },
      { status: 400 },
    );
  }

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { message: "dateFrom não pode ser maior que dateTo." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { message: "Projeto não encontrado." },
      { status: 404 },
    );
  }

  if (metaAccountId) {
    const metaAccount = await prisma.metaAccount.findFirst({
      where: {
        id: metaAccountId,
        projectId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!metaAccount) {
      return NextResponse.json(
        { message: "Conta Meta Ads não encontrada para este projeto." },
        { status: 404 },
      );
    }
  }

  const autoSync = await syncGamRevenue({ userId });

  const report = await generateCampaignRoiReport({
    userId,
    projectId,
    metaAccountId,
    dateFrom,
    dateTo,
  });

  return NextResponse.json({ autoSync, report });
}

function parseDateBoundary(value: string, boundary: "start" | "end") {
  const date = new Date(
    `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
