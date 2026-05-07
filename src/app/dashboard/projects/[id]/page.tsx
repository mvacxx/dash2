import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Globe2 } from "lucide-react";

import { PageContainer } from "@/components/dashboard/page-container";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { ProjectForm } from "@/components/projects/project-form";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/projects");
  }

  const project = await prisma.project.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          href="/dashboard/projects"
        >
          <ArrowLeft size={18} />
          Voltar para projetos
        </Link>
      </div>

      <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <Badge variant="success">Projeto</Badge>
            <div className="mt-5 flex items-center gap-4">
              <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-3">
                <Globe2 className="text-indigo-200" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">{project.name}</h1>
                <p className="mt-1 text-sm text-slate-400">{project.domain}</p>
              </div>
            </div>
          </div>
          <DeleteProjectButton projectId={project.id} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <ProjectForm
          project={{
            id: project.id,
            name: project.name,
            domain: project.domain,
            timezone: project.timezone,
            currency: project.currency,
            loveTaxPercent: project.loveTaxPercent,
            operationalCostPercent: project.operationalCostPercent,
          }}
        />

        <aside className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
          <h2 className="text-xl font-semibold tracking-tight text-white">Resumo operacional</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-3">
              <dt className="text-slate-500">Love tax</dt>
              <dd className="font-semibold text-slate-200">{project.loveTaxPercent}%</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-3">
              <dt className="text-slate-500">Custo operacional</dt>
              <dd className="font-semibold text-slate-200">{project.operationalCostPercent}%</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/[0.03] p-3">
              <dt className="text-slate-500">Moeda</dt>
              <dd className="font-semibold text-slate-200">{project.currency}</dd>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-3">
              <dt className="text-slate-500">Timezone</dt>
              <dd className="mt-1 font-semibold text-slate-200">{project.timezone}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            Dados de Meta Ads, GAM / ActiveView e ROI ainda não são vinculados a
            projetos nesta etapa.
          </p>
        </aside>
      </section>
    </PageContainer>
  );
}
