import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";
import { gamConnectionSchema } from "@/lib/gam-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const maskedToken = "********";

function serializeGamConnection(connection: {
  id: string;
  userId: string;
  projectId: string;
  networkCode: string;
  domain: string;
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

  const connections = await prisma.gamConnection.findMany({
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

  return NextResponse.json({ connections: connections.map(serializeGamConnection) });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = gamConnectionSchema.safeParse(body);

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

  const duplicatedConnection = await prisma.gamConnection.findFirst({
    where: {
      projectId: parsedBody.data.projectId,
      networkCode: parsedBody.data.networkCode,
    },
    select: {
      id: true,
    },
  });

  if (duplicatedConnection) {
    return NextResponse.json(
      {
        message: "Este projeto já possui uma conexão GAM com este network code.",
      },
      {
        status: 409,
      },
    );
  }

  const { authToken, ...connectionData } = parsedBody.data;
  const connection = await prisma.gamConnection.create({
    data: {
      ...connectionData,
      userId,
      authToken: encryptToken(authToken),
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

  return NextResponse.json({ connection: serializeGamConnection(connection) }, { status: 201 });
}
