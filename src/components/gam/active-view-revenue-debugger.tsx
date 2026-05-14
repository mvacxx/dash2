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

type GamConnectionOption = {
  id: string;
  networkCode: string;
  domain: string;
};

type ActiveViewRevenueRow = {
  id: string;
  projectId: string;
  gamConnectionId: string;
  date: string;
  domain: string;
  networkCode: string;
  source?: string | null;
  campaignKey?: string | null;
  adKey?: string | null;
  revenueGross: number;
  revenueNet: number;
  views: number;
  rpm: number;
  currency: string;
  rawJson?: unknown;
  createdAt: string;
  project: ProjectOption;
  gamConnection: GamConnectionOption;
};

type ActiveViewRevenueDebuggerProps = {
  projects: ProjectOption[];
  gamConnections: GamConnectionOption[];
  revenue: ActiveViewRevenueRow[];
  selectedProjectId: string;
};

type ApiResponse = {
  message?: string;
};

export function ActiveViewRevenueDebugger({
  gamConnections,
  projects,
  revenue,
  selectedProjectId,
}: ActiveViewRevenueDebuggerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const selectedConnection = gamConnections[0];
  const canCreate = gamConnections.length > 0;

  function handleProjectChange(projectId: string) {
    router.push(`/dashboard/gam/revenue?projectId=${projectId}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const rawJsonText = String(formData.get("rawJson") ?? "").trim();
    let rawJson: unknown;

    if (rawJsonText) {
      try {
        rawJson = JSON.parse(rawJsonText) as unknown;
      } catch {
        setError("Raw JSON precisa ser um JSON válido.");
        return;
      }
    }

    const payload = {
      projectId: selectedProjectId,
      gamConnectionId: String(formData.get("gamConnectionId") ?? ""),
      date: String(formData.get("date") ?? ""),
      domain: String(formData.get("domain") ?? ""),
      networkCode: String(formData.get("networkCode") ?? ""),
      source: String(formData.get("source") ?? ""),
      campaignKey: String(formData.get("campaignKey") ?? ""),
      adKey: String(formData.get("adKey") ?? ""),
      revenueGross: Number(formData.get("revenueGross") ?? 0),
      revenueNet: Number(formData.get("revenueNet") ?? 0),
      views: Number(formData.get("views") ?? 0),
      rpm: Number(formData.get("rpm") ?? 0),
      currency: String(formData.get("currency") ?? "BRL"),
      rawJson,
    };

    startTransition(async () => {
      const response = await fetch("/api/gam/revenue/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível salvar a receita manual.");
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
            <h2 className="mt-3 text-xl font-semibold text-white">ActiveView Revenue</h2>
            <p className="mt-1 text-sm text-slate-400">
              Insira receita manual por chave de campanha/anúncio para testar o cálculo de ROI.
            </p>
          </div>
          <Database className="text-indigo-200" size={24} />
        </div>

        {!canCreate ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            Cadastre uma conexão GAM para {selectedProject?.name ?? "este projeto"} antes de inserir receita.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="gamConnectionId">
                  Conexão GAM
                </label>
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                  id="gamConnectionId"
                  name="gamConnectionId"
                >
                  {gamConnections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.networkCode} — {connection.domain}
                    </option>
                  ))}
                </select>
              </div>
              <FormInput label="Data" name="date" required type="date" />
              <FormInput defaultValue={selectedConnection?.domain} label="Domain" name="domain" required />
              <FormInput defaultValue={selectedConnection?.networkCode} label="Network code" name="networkCode" required />
              <FormInput label="Source" name="source" placeholder="activeview" />
              <FormInput label="Campaign key" name="campaignKey" placeholder="utm_campaign ou campaign_id" />
              <FormInput label="Ad key" name="adKey" placeholder="fb_ad_id" />
              <FormInput label="Revenue gross" name="revenueGross" step="0.01" type="number" />
              <FormInput label="Revenue net" name="revenueNet" step="0.01" type="number" />
              <FormInput label="Views" name="views" type="number" />
              <FormInput label="RPM" name="rpm" step="0.01" type="number" />
              <FormInput defaultValue="BRL" label="Currency" maxLength={3} name="currency" required />
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="rawJson">
                  Raw JSON opcional
                </label>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                  id="rawJson"
                  name="rawJson"
                  placeholder='{"lineItem":"debug"}'
                />
              </div>
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <Button className="gap-2" disabled={isPending} type="submit">
              <Plus size={18} />
              {isPending ? "Salvando..." : "Salvar receita manual"}
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
                <th className="px-4 py-3">GAM</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Campaign key</th>
                <th className="px-4 py-3">Ad key</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">RPM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {revenue.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={9}>
                    Nenhuma receita manual cadastrada para este projeto.
                  </td>
                </tr>
              ) : (
                revenue.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{formatDate(item.date)}</td>
                    <td className="px-4 py-3">{item.gamConnection.networkCode}</td>
                    <td className="px-4 py-3">{item.domain}</td>
                    <td className="px-4 py-3">{item.campaignKey ?? "—"}</td>
                    <td className="px-4 py-3">{item.adKey ?? "—"}</td>
                    <td className="px-4 py-3">{formatCurrency(item.revenueGross, item.currency)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.revenueNet, item.currency)}</td>
                    <td className="px-4 py-3">{item.views.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{formatCurrency(item.rpm, item.currency)}</td>
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

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency,
    style: "currency",
  }).format(value);
}
