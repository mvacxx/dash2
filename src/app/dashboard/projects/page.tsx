import Link from "next/link";
import { Globe2, Plus, Settings2 } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/projects");
  }

  const projects = await prisma.project.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">Projetos</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Projetos e sites</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Crie os projetos que receberão dados futuros de campanhas, receitas,
            mapeamentos e relatórios de performance.
          </p>
        </div>
        <Link
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-400 hover:to-blue-400 md:w-auto"
          href="/dashboard/projects/new"
        >
          <Plus size={18} />
          Novo projeto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Nenhum projeto criado"
            description="Cadastre seu primeiro projeto/site para preparar a base dos dados futuros do Dashzada ROI. Nenhuma integração externa será criada nesta etapa."
            icon={Globe2}
            title="Comece criando um projeto"
          />
        </div>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              className="group rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/20 transition hover:border-indigo-300/40 hover:bg-slate-900/70"
              href={`/dashboard/projects/${project.id}`}
              key={project.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-3">
                  <Globe2 className="text-indigo-200" size={22} />
                </div>
                <Badge>Ativo</Badge>
              </div>
              <h2 className="mt-6 text-xl font-semibold tracking-tight text-white">{project.name}</h2>
              <p className="mt-2 text-sm text-slate-400">{project.domain}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/[0.03] p-3">
                  <dt className="text-slate-500">Moeda</dt>
                  <dd className="mt-1 font-semibold text-slate-200">{project.currency}</dd>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-3">
                  <dt className="text-slate-500">Timezone</dt>
                  <dd className="mt-1 truncate font-semibold text-slate-200">{project.timezone}</dd>
                </div>
              </dl>
              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-indigo-200">
                <Settings2 size={16} />
                Gerenciar projeto
              </div>
            </Link>
          ))}
        </section>
      )}
    </PageContainer>
  );
}
