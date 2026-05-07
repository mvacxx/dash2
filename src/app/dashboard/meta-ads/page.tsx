import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { MetaAccountsManager } from "@/components/meta/meta-accounts-manager";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MetaAdsPageProps = {
  searchParams?: Promise<{
    projectId?: string;
  }>;
};

export default async function MetaAdsPage({ searchParams }: MetaAdsPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/meta-ads");
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

  const accounts = selectedProjectId
    ? await prisma.metaAccount.findMany({
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
  const safeAccounts = accounts.map(
    ({ accessToken: _accessToken, ...account }) => ({
      ...account,
      accessToken: "********",
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    }),
  );

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">Meta Ads</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Contas Meta Ads
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Cadastre múltiplas contas Meta Ads por projeto, guarde tokens com
            segurança e sincronize insights reais de campanhas para alimentar o
            ROI.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Crie um projeto primeiro"
            description="Toda conta Meta Ads precisa estar vinculada a um projeto/site. Crie um projeto antes de cadastrar credenciais."
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
          <MetaAccountsManager
            accounts={safeAccounts}
            projects={projects}
            selectedProjectId={selectedProjectId ?? projects[0].id}
          />
        </div>
      )}
    </PageContainer>
  );
}
