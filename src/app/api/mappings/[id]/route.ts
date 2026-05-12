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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  const existingMapping = await prisma.campaignMapping.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingMapping) {
    return NextResponse.json({ message: "Mapeamento não encontrado." }, { status: 404 });
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
      NOT: {
        id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedMapping) {
    return NextResponse.json(
      {
        message: "Este projeto já possui outro mapeamento para esta campanha Meta Ads.",
      },
      {
        status: 409,
      },
    );
  }

  const mapping = await prisma.campaignMapping.update({
    where: {
      id,
    },
    data: parsedBody.data,
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

  return NextResponse.json({ mapping });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const mapping = await prisma.campaignMapping.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!mapping) {
    return NextResponse.json({ message: "Mapeamento não encontrado." }, { status: 404 });
  }

  await prisma.campaignMapping.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ ok: true });
}
