import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { updateMetaAccountSchema } from "@/lib/meta-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maskedToken = "********";

function serializeMetaAccount(account: {
  id: string;
  userId: string;
  projectId: string;
  label: string;
  adAccountId: string;
  connectionType: "META_API" | "MANUAL";
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    domain: string;
  };
}) {
  return {
    ...account,
    accessToken: maskedToken,
  };
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
  const parsedBody = updateMetaAccountSchema.safeParse(body);

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

  const account = await prisma.metaAccount.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    return NextResponse.json({ message: "Conta Meta Ads não encontrada." }, { status: 404 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: parsedBody.data.projectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
  }

  const duplicatedAccount = await prisma.metaAccount.findFirst({
    where: {
      projectId: parsedBody.data.projectId,
      adAccountId: parsedBody.data.adAccountId,
      NOT: {
        id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedAccount) {
    return NextResponse.json(
      {
        message: "Este projeto já possui outra conta Meta Ads com este ID.",
      },
      {
        status: 409,
      },
    );
  }

  const { accessToken, ...accountData } = parsedBody.data;
  const updatedAccount = await prisma.metaAccount.update({
    where: {
      id,
    },
    data: {
      ...accountData,
      ...(accessToken ? { accessToken: encryptToken(accessToken) } : {}),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          domain: true,
        },
      },
    },
  });

  return NextResponse.json({ account: serializeMetaAccount(updatedAccount) });
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

  const account = await prisma.metaAccount.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!account) {
    return NextResponse.json({ message: "Conta Meta Ads não encontrada." }, { status: 404 });
  }

  await prisma.metaAccount.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ ok: true });
}
