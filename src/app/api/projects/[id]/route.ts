import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/project-validation";

async function getAuthenticatedUserId() {
  const session = await auth();

  return session?.user?.id ?? null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!project) {
    return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = projectSchema.safeParse(body);

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
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
  }

  const duplicatedDomain = await prisma.project.findFirst({
    where: {
      userId,
      domain: parsedBody.data.domain,
      NOT: {
        id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicatedDomain) {
    return NextResponse.json(
      {
        message: "Você já possui outro projeto com este domínio.",
      },
      {
        status: 409,
      },
    );
  }

  const updatedProject = await prisma.project.update({
    where: {
      id,
    },
    data: parsedBody.data,
  });

  return NextResponse.json({ project: updatedProject });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return NextResponse.json({ message: "Projeto não encontrado." }, { status: 404 });
  }

  await prisma.project.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ ok: true });
}
