import Link from "next/link";
import { Link2, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { MappingsManager } from "@/components/mappings/mappings-manager";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MappingsPageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function MappingsPage({ searchParams }: MappingsPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/mappings");
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
  const selectedProjectId = projects.some((project) => project.id === params?.projectId)
    ? params?.projectId
    : projects[0]?.id;

  const [metaAccounts, gamConnections, mappings] = selectedProjectId
    ? await Promise.all([
        prisma.metaAccount.findMany({
          where: {
            projectId: selectedProjectId,
            userId,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            label: true,
            adAccountId: true,
          },
        }),
        prisma.gamConnection.findMany({
          where: {
            projectId: selectedProjectId,
            userId,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            networkCode: true,
            domain: true,
          },
        }),
        prisma.campaignMapping.findMany({
          where: {
            projectId: selectedProjectId,
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
          orderBy: {
            createdAt: "desc",
          },
        }),
      ])
    : [[], [], []];
  const safeMappings = mappings.map((mapping) => ({
    ...mapping,
    createdAt: mapping.createdAt.toISOString(),
    updatedAt: mapping.updatedAt.toISOString(),
  }));

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">Mapeamentos</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Mapeamentos de campanhas
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Vincule campanhas Meta Ads aos campos ActiveView/GAM para preparar a
            futura conciliação de gasto, receita e ROI por campanha.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Crie um projeto primeiro"
            description="Todo mapeamento precisa pertencer a um projeto. Cadastre um projeto antes de vincular campanhas e campos ActiveView/GAM."
            icon={Link2}
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
          <MappingsManager
            gamConnections={gamConnections}
            mappings={safeMappings}
            metaAccounts={metaAccounts}
            projects={projects}
            selectedProjectId={selectedProjectId ?? projects[0].id}
          />
        </div>
      )}
    </PageContainer>
  );
}
