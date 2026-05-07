import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/project-validation";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

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

  const existingProject = await prisma.project.findUnique({
    where: {
      userId_domain: {
        userId,
        domain: parsedBody.data.domain,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingProject) {
    return NextResponse.json(
      {
        message: "Você já possui um projeto com este domínio.",
      },
      {
        status: 409,
      },
    );
  }

  const project = await prisma.project.create({
    data: {
      ...parsedBody.data,
      userId,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
