import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { GamConnectionsManager } from "@/components/gam/gam-connections-manager";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type GamPageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function GamPage({ searchParams }: GamPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/gam");
  }

  const params = await searchParams;
  const projects = await prisma.project.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      domain: true,
    },
  });
  const selectedProjectId = projects.some(
    (project) => project.id === params?.projectId,
  )
    ? params?.projectId
    : projects[0]?.id;

  const connections = selectedProjectId
    ? await prisma.gamConnection.findMany({
        where: {
          userId,
          projectId: selectedProjectId,
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
      })
    : [];
  const safeConnections = connections.map(
    ({ authToken: _authToken, ...connection }) => ({
      ...connection,
      authToken: "********",
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
    }),
  );

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">GAM / ActiveView</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Conexões GAM / ActiveView
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Cadastre a conexão ActiveView/GAM por projeto, guarde credenciais
            com segurança e sincronize receitas reais para alimentar o ROI.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Crie um projeto primeiro"
            description="Toda conexão GAM / ActiveView precisa estar vinculada a um projeto/site. Crie um projeto antes de cadastrar credenciais."
            icon={BarChart3}
            title="Nenhum projeto disponível"
          />
          <div className="mt-5 flex justify-center">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-400 hover:to-blue-400"
              href="/dashboard/projects/new"
            >
              <Plus size={18} />
              Criar projeto
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <GamConnectionsManager
            connections={safeConnections}
            projects={projects}
            selectedProjectId={selectedProjectId ?? projects[0].id}
          />
        </div>
      )}
    </PageContainer>
  );
}
