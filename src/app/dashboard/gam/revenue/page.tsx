import Link from "next/link";
import { BarChart3, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { ActiveViewRevenueDebugger } from "@/components/gam/active-view-revenue-debugger";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ActiveViewRevenuePageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function ActiveViewRevenuePage({ searchParams }: ActiveViewRevenuePageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/gam/revenue");
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

  const [gamConnections, revenue] = selectedProjectId
    ? await Promise.all([
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
        prisma.activeViewRevenue.findMany({
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
            gamConnection: {
              select: {
                id: true,
                networkCode: true,
                domain: true,
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
  const safeRevenue = revenue.map((item) => ({
    ...item,
    date: item.date.toISOString(),
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">GAM / ActiveView</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Receita ActiveView manual</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Cadastre receita bruta/líquida, views e RPM por domínio e chave de campanha para validar ROI antes da
            integração oficial com relatórios GAM/ActiveView.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Crie um projeto primeiro"
            description="A receita manual precisa pertencer a um projeto. Cadastre um projeto antes de inserir dados de teste."
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
          <ActiveViewRevenueDebugger
            gamConnections={gamConnections}
            projects={projects}
            revenue={safeRevenue}
            selectedProjectId={selectedProjectId ?? projects[0].id}
          />
        </div>
      )}
    </PageContainer>
  );
}
