"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectFormData = {
  id?: string;
  name: string;
  domain: string;
  timezone: string;
  currency: string;
  loveTaxPercent: number;
  operationalCostPercent: number;
};

type ProjectFormProps = {
  project?: ProjectFormData;
};

type ProjectResponse = {
  message?: string;
  project?: {
    id: string;
  };
};

const defaultProject: ProjectFormData = {
  name: "",
  domain: "",
  timezone: "America/Sao_Paulo",
  currency: "BRL",
  loveTaxPercent: 0,
  operationalCostPercent: 0,
};

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formProject = project ?? defaultProject;
  const isEditing = Boolean(project?.id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      domain: String(formData.get("domain") ?? "").trim(),
      timezone: String(formData.get("timezone") ?? "").trim(),
      currency: String(formData.get("currency") ?? "").trim().toUpperCase(),
      loveTaxPercent: Number(formData.get("loveTaxPercent") ?? 0),
      operationalCostPercent: Number(formData.get("operationalCostPercent") ?? 0),
    };

    startTransition(async () => {
      const endpoint = isEditing ? `/api/projects/${project?.id}` : "/api/projects";
      const response = await fetch(endpoint, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as ProjectResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível salvar o projeto. Tente novamente.");
        return;
      }

      router.push(`/dashboard/projects/${data?.project?.id ?? project?.id}`);
      router.refresh();
    });
  }

  return (
    <form
      className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="name">
            Nome do projeto
          </label>
          <Input
            required
            defaultValue={formProject.name}
            id="name"
            minLength={2}
            name="name"
            placeholder="Ex: Portal de Notícias"
            type="text"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="domain">
            Domínio
          </label>
          <Input
            required
            defaultValue={formProject.domain}
            id="domain"
            name="domain"
            placeholder="exemplo.com.br"
            type="text"
          />
          <p className="mt-2 text-xs text-slate-500">Informe apenas o domínio, sem http, https, caminho ou barras.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="timezone">
            Timezone
          </label>
          <Input
            required
            defaultValue={formProject.timezone}
            id="timezone"
            name="timezone"
            type="text"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="currency">
            Moeda
          </label>
          <Input
            required
            defaultValue={formProject.currency}
            id="currency"
            maxLength={3}
            minLength={3}
            name="currency"
            type="text"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="loveTaxPercent">
            Love tax (%)
          </label>
          <Input
            required
            defaultValue={formProject.loveTaxPercent}
            id="loveTaxPercent"
            min={0}
            name="loveTaxPercent"
            step="0.01"
            type="number"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="operationalCostPercent">
            Custo operacional (%)
          </label>
          <Input
            required
            defaultValue={formProject.operationalCostPercent}
            id="operationalCostPercent"
            min={0}
            name="operationalCostPercent"
            step="0.01"
            type="number"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button className="sm:w-auto" disabled={isPending} type="submit">
          <Save size={18} />
          {isPending ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </div>
    </form>
  );
}
