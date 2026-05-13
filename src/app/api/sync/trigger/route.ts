import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { syncMetaInsights } from "@/lib/meta";
import { prisma } from "@/lib/prisma";
import { syncGamRevenue } from "@/services/gam-auto-sync";
import { generateCampaignRoiReport } from "@/services/roi-service";

const triggerSyncSchema = z.object({
  dateFrom: z.coerce.date({
    invalid_type_error: "Informe uma data inicial válida.",
    required_error: "Informe dateFrom.",
  }),
  dateTo: z.coerce.date({
    invalid_type_error: "Informe uma data final válida.",
    required_error: "Informe dateTo.",
  }),
  force: z.boolean().optional().default(true),
  projectId: z.string().min(1, "Informe o projeto."),
});

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

  const { dateFrom, dateTo, force, projectId } = parsedBody.data;

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { message: "A data inicial não pode ser maior que a data final." },
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

  const syncDateFrom = startOfUtcDay(dateFrom);
  const syncDateTo = endOfUtcDay(dateTo);
  const [metaAccounts, gamConnectionsCount] = await Promise.all([
    prisma.metaAccount.findMany({
      where: {
        projectId,
        userId,
      },
      select: {
        id: true,
        label: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.gamConnection.count({
      where: {
        userId,
        projectId,
      },
    }),
  ]);

  console.log("[SYNC TRIGGER]", {
    projectId,
    dateFrom: toDateInputValue(syncDateFrom),
    dateTo: toDateInputValue(syncDateTo),
    connectionsCount: gamConnectionsCount,
  });

  let metaRows = 0;

  for (const account of metaAccounts) {
    const result = await syncMetaInsights({
      userId,
      projectId,
      metaAccountId: account.id,
      dateFrom: syncDateFrom,
      dateTo: syncDateTo,
    });

    metaRows += result.count;
    console.log("[META SYNC]", {
      account: account.id,
      rows: result.count,
    });
  }

  const gamResult = await syncGamRevenue({
    dateFrom: syncDateFrom,
    dateTo: syncDateTo,
    force,
    projectId,
    userId,
  });
  const gamRows = gamResult.rowsReceived;
  const gamRevenueTotal = gamResult.connections.reduce(
    (total, connection) => total + connection.revenueTotal,
    0,
  );
  let gamCampaignsMatched = gamResult.connections.reduce(
    (total, connection) => total + connection.campaignsMatched,
    0,
  );

  const roiReport = await generateCampaignRoiReport({
    userId,
    projectId,
    dateFrom: syncDateFrom,
    dateTo: syncDateTo,
  });
  const roiRows = roiReport.rows.length;
  gamCampaignsMatched = roiReport.rows.filter(
    (row) => row.revenueGross > 0 || row.revenueNet > 0,
  ).length;
  const rows = metaRows + gamRows;

  console.log("[GAM SYNC]", {
    rows: gamRows,
    revenueTotal: gamRevenueTotal,
    campaignsMatched: gamCampaignsMatched,
  });

  console.log("[ROI SYNC]", {
    rows: roiRows,
  });

  return NextResponse.json({
    ok: true,
    accounts: metaAccounts.length,
    gamConnections: gamConnectionsCount,
    metaRows,
    gamRows,
    gamRevenueTotal,
    gamCampaignsMatched,
    rows,
    roiRows,
    syncSince: toDateInputValue(syncDateFrom),
    syncUntil: toDateInputValue(syncDateTo),
    message: `Sync concluído: ${metaAccounts.length} contas, ${gamRows} linhas KVP, ${formatCurrency(gamRevenueTotal)} revenue, ${gamCampaignsMatched} campaigns matched`,
    result: {
      gam: gamResult,
      roi: {
        rows: roiRows,
      },
    },
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
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

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
