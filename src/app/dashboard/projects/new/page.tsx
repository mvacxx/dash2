import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageContainer } from "@/components/dashboard/page-container";
import { ProjectForm } from "@/components/projects/project-form";
import { Badge } from "@/components/ui/badge";

export default function NewProjectPage() {
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

      <section className="mb-8 max-w-3xl">
        <Badge variant="success">Novo projeto</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Criar projeto</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Configure o site que futuramente receberá campanhas, receitas e
          relatórios vinculados. Nesta etapa, apenas a base do projeto é salva.
        </p>
      </section>

      <ProjectForm />
    </PageContainer>
  );
}
