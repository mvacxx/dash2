import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { createMetaAccountSchema } from "@/lib/meta-validation";
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

  const accounts = await prisma.metaAccount.findMany({
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ accounts: accounts.map(serializeMetaAccount) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = createMetaAccountSchema.safeParse(body);

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
    },
    select: {
      id: true,
    },
  });

  if (duplicatedAccount) {
    return NextResponse.json(
      {
        message: "Este projeto já possui uma conta Meta Ads com este ID.",
      },
      {
        status: 409,
      },
    );
  }

  const { accessToken, ...accountData } = parsedBody.data;
  const account = await prisma.metaAccount.create({
    data: {
      ...accountData,
      userId,
      accessToken: encryptToken(accessToken),
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

  return NextResponse.json({ account: serializeMetaAccount(account) }, { status: 201 });
}
