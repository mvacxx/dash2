import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { MetaInsightsDebugger } from "@/components/meta/meta-insights-debugger";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MetaInsightsPageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function MetaInsightsPage({ searchParams }: MetaInsightsPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/meta-ads/insights");
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

  const [metaAccounts, insights] = selectedProjectId
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
        prisma.metaInsight.findMany({
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
          },
          orderBy: [
            {
              date: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
        }),
      ])
    : [[], []];
  const safeInsights = insights.map((insight) => ({
    ...insight,
    date: insight.date.toISOString(),
    createdAt: insight.createdAt.toISOString(),
  }));

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">Meta Ads</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Meta Insights manuais</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Cadastre dados de gasto, impressões, cliques e métricas de campanha para validar o ROI antes de conectar
            a importação oficial da Meta API.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Crie um projeto primeiro"
            description="Os insights manuais precisam pertencer a um projeto. Cadastre um projeto antes de inserir dados de teste."
            icon={Megaphone}
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
          <MetaInsightsDebugger
            insights={safeInsights}
            metaAccounts={metaAccounts}
            projects={projects}
            selectedProjectId={selectedProjectId ?? projects[0].id}
          />
        </div>
      )}
    </PageContainer>
  );
}
