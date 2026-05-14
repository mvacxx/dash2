import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { campaignMappingSchema } from "@/lib/mapping-validation";
import { prisma } from "@/lib/prisma";

async function validateMappingOwnership({
  gamConnectionId,
  metaAccountId,
  projectId,
  userId,
}: {
  gamConnectionId: string;
  metaAccountId: string;
  projectId: string;
  userId: string;
}) {
  const [project, metaAccount, gamConnection] = await Promise.all([
    prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.metaAccount.findFirst({
      where: {
        id: metaAccountId,
        projectId,
        userId,
      },
      select: {
        id: true,
      },
    }),
    prisma.gamConnection.findFirst({
      where: {
        id: gamConnectionId,
        projectId,
        userId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!project) {
    return "Projeto não encontrado.";
  }

  if (!metaAccount) {
    return "Conta Meta Ads não encontrada para este projeto.";
  }

  if (!gamConnection) {
    return "Conexão GAM não encontrada para este projeto.";
  }

  return null;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;

  if (projectId) {
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
      return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
    }
  }

  const mappings = await prisma.campaignMapping.findMany({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
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
      gamConnection: {
        select: {
          id: true,
          networkCode: true,
          domain: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ mappings });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = campaignMappingSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        message: parsedBody.error.issues[0]?.message ?? "Dados inválidos.",
      },
      {
        status: 400,
      },
    );
  }

  const ownershipError = await validateMappingOwnership({
    gamConnectionId: parsedBody.data.gamConnectionId,
    metaAccountId: parsedBody.data.metaAccountId,
    projectId: parsedBody.data.projectId,
    userId,
  });

  if (ownershipError) {
    return NextResponse.json({ message: ownershipError }, { status: 404 });
  }

  const duplicatedMapping = await prisma.campaignMapping.findFirst({
    where: {
      projectId: parsedBody.data.projectId,
      facebookCampaignId: parsedBody.data.facebookCampaignId,
    },
    select: {
      id: true,
    },
  });

  if (duplicatedMapping) {
    return NextResponse.json(
      {
        message: "Este projeto já possui um mapeamento para esta campanha Meta Ads.",
      },
      {
        status: 409,
      },
    );
  }

  const mapping = await prisma.campaignMapping.create({
    data: {
      ...parsedBody.data,
      userId,
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
      gamConnection: {
        select: {
          id: true,
          networkCode: true,
          domain: true,
        },
      },
    },
  });

  return NextResponse.json({ mapping }, { status: 201 });
}
