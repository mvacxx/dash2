import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { updateGamConnectionSchema } from "@/lib/gam-validation";

export const runtime = "nodejs";

const maskedToken = "********";

function serializeGamConnection(connection: {
  id: string;
  userId: string;
  projectId: string;
  networkCode: string;
  domain: string;
  apiBaseUrl: string;
  reportEndpoint: string;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    domain: string;
  };
}) {
  return {
    ...connection,
    authToken: maskedToken,
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
  const parsedBody = updateGamConnectionSchema.safeParse(body);

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

  const connection = await prisma.gamConnection.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    return NextResponse.json({ message: "Conexão GAM não encontrada." }, { status: 404 });
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

  const duplicatedConnection = await prisma.gamConnection.findFirst({
    where: {
      projectId: parsedBody.data.projectId,
      networkCode: parsedBody.data.networkCode,
      NOT: {
        id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedConnection) {
    return NextResponse.json(
      {
        message: "Este projeto já possui outra conexão GAM com este network code.",
      },
      {
        status: 409,
      },
    );
  }

  const { authToken, ...connectionData } = parsedBody.data;
  const updatedConnection = await prisma.gamConnection.update({
    where: {
      id,
    },
    data: {
      ...connectionData,
      ...(authToken ? { authToken: encryptToken(authToken) } : {}),
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

  return NextResponse.json({ connection: serializeGamConnection(updatedConnection) });
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

  const connection = await prisma.gamConnection.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!connection) {
    return NextResponse.json({ message: "Conexão GAM não encontrada." }, { status: 404 });
  }

  await prisma.gamConnection.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ ok: true });
}
