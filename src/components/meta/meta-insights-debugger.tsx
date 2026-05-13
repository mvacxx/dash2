"use client";

import { FormEvent, useMemo, useState, useTransition, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { Database, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProjectOption = {
  id: string;
  name: string;
  domain: string;
};

type MetaAccountOption = {
  id: string;
  label: string;
  adAccountId: string;
};

type MetaInsightRow = {
  id: string;
  projectId: string;
  metaAccountId: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  date: string;
  level: string;
  createdAt: string;
  project: ProjectOption;
  metaAccount: MetaAccountOption;
};

type MetaInsightsDebuggerProps = {
  projects: ProjectOption[];
  metaAccounts: MetaAccountOption[];
  insights: MetaInsightRow[];
  selectedProjectId: string;
};

type ApiResponse = {
  message?: string;
};

export function MetaInsightsDebugger({
  insights,
  metaAccounts,
  projects,
  selectedProjectId,
}: MetaInsightsDebuggerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const canCreate = metaAccounts.length > 0;

  function handleProjectChange(projectId: string) {
    router.push(`/dashboard/meta-ads/insights?projectId=${projectId}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      projectId: selectedProjectId,
      metaAccountId: String(formData.get("metaAccountId") ?? ""),
      campaignId: String(formData.get("campaignId") ?? ""),
      campaignName: String(formData.get("campaignName") ?? ""),
      spend: Number(formData.get("spend") ?? 0),
      impressions: Number(formData.get("impressions") ?? 0),
      clicks: Number(formData.get("clicks") ?? 0),
      cpc: Number(formData.get("cpc") ?? 0),
      cpm: Number(formData.get("cpm") ?? 0),
      ctr: Number(formData.get("ctr") ?? 0),
      date: String(formData.get("date") ?? ""),
      level: String(formData.get("level") ?? "campaign"),
    };

    startTransition(async () => {
      const response = await fetch("/api/meta/insights/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível salvar o insight manual.");
        return;
      }

      form.reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="projectId">
          Projeto
        </label>
        <select
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          id="projectId"
          onChange={(event) => handleProjectChange(event.target.value)}
          value={selectedProjectId}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} — {project.domain}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <Badge variant="success">Entrada manual</Badge>
            <h2 className="mt-3 text-xl font-semibold text-white">Meta Insights</h2>
            <p className="mt-1 text-sm text-slate-400">
              Insira dados por campanha para testar ROI antes da integração real com a Meta API.
            </p>
          </div>
          <Database className="text-indigo-200" size={24} />
        </div>

        {!canCreate ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Cadastre uma conta Meta Ads para {selectedProject?.name ?? "este projeto"} antes de inserir insights.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="metaAccountId">
                  Conta Meta Ads
                </label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                  id="metaAccountId"
                  name="metaAccountId"
                >
                  {metaAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label} — {account.adAccountId}
                    </option>
                  ))}
                </select>
              </div>
              <FormInput label="Data" name="date" required type="date" />
              <FormInput label="Campaign ID" name="campaignId" placeholder="123456789" required />
              <FormInput label="Campaign name" name="campaignName" placeholder="Campanha Teste" required />
              <FormInput defaultValue="campaign" label="Level" name="level" />
              <FormInput label="Spend" name="spend" step="0.01" type="number" />
              <FormInput label="Impressions" name="impressions" type="number" />
              <FormInput label="Clicks" name="clicks" type="number" />
              <FormInput label="CPC" name="cpc" step="0.01" type="number" />
              <FormInput label="CPM" name="cpm" step="0.01" type="number" />
              <FormInput label="CTR" name="ctr" step="0.0001" type="number" />
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <Button className="gap-2" disabled={isPending} type="submit">
              <Plus size={18} />
              {isPending ? "Salvando..." : "Salvar insight manual"}
            </Button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-xl font-semibold text-white">Dados cadastrados</h2>
          <p className="mt-1 text-sm text-slate-400">Listagem de debug filtrada pelo projeto selecionado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Conta</th>
                <th className="px-4 py-3">Campanha</th>
                <th className="px-4 py-3">Spend</th>
                <th className="px-4 py-3">Impr.</th>
                <th className="px-4 py-3">Clicks</th>
                <th className="px-4 py-3">CPC</th>
                <th className="px-4 py-3">CPM</th>
                <th className="px-4 py-3">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {insights.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                    Nenhum insight manual cadastrado para este projeto.
                  </td>
                </tr>
              ) : (
                insights.map((insight) => (
                  <tr key={insight.id}>
                    <td className="px-4 py-3">{formatDate(insight.date)}</td>
                    <td className="px-4 py-3">{insight.metaAccount.label}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{insight.campaignName}</div>
                      <div className="text-xs text-slate-500">{insight.campaignId}</div>
                    </td>
                    <td className="px-4 py-3">{formatCurrency(insight.spend)}</td>
                    <td className="px-4 py-3">{insight.impressions.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{insight.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{formatCurrency(insight.cpc)}</td>
                    <td className="px-4 py-3">{formatCurrency(insight.cpm)}</td>
                    <td className="px-4 py-3">{insight.ctr.toLocaleString("pt-BR")}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={String(props.name)}>
        {label}
      </label>
      <Input id={String(props.name)} min={props.type === "number" ? "0" : undefined} {...props} />
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}
