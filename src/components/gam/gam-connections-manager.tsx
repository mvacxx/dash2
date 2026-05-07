"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const maskedToken = "********";

type ProjectOption = {
  id: string;
  name: string;
  domain: string;
};

type GamConnection = {
  id: string;
  projectId: string;
  networkCode: string;
  domain: string;
  authToken: string;
  apiBaseUrl: string;
  reportEndpoint: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectOption;
};

type GamConnectionsManagerProps = {
  projects: ProjectOption[];
  connections: GamConnection[];
  selectedProjectId: string;
};

type ApiResponse = {
  message?: string;
};

export function GamConnectionsManager({
  projects,
  connections,
  selectedProjectId,
}: GamConnectionsManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  function handleProjectChange(projectId: string) {
    router.push(`/dashboard/gam?projectId=${projectId}`);
  }

  function resetCreateForm(form: HTMLFormElement) {
    form.reset();
    const projectInput = form.elements.namedItem("projectId") as HTMLInputElement | null;

    if (projectInput) {
      projectInput.value = selectedProjectId;
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const payload = buildPayload(new FormData(form), selectedProjectId, true);

    startTransition(async () => {
      const response = await fetch("/api/gam/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível criar a conexão GAM.");
        return;
      }

      resetCreateForm(form);
      router.refresh();
    });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, connectionId: string) {
    event.preventDefault();
    setError(null);

    const payload = buildPayload(new FormData(event.currentTarget), selectedProjectId, false);

    startTransition(async () => {
      const response = await fetch(`/api/gam/connections/${connectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível atualizar a conexão GAM.");
        return;
      }

      setEditingConnectionId(null);
      router.refresh();
    });
  }

  function handleDelete(connectionId: string) {
    const confirmed = window.confirm("Tem certeza que deseja remover esta conexão GAM?");

    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingConnectionId(connectionId);

    startTransition(async () => {
      const response = await fetch(`/api/gam/connections/${connectionId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível remover a conexão GAM.");
        setDeletingConnectionId(null);
        return;
      }

      setDeletingConnectionId(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <Badge variant="success">Projeto selecionado</Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          {selectedProject?.name ?? "Selecione um projeto"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {selectedProject?.domain ?? "As conexões GAM / ActiveView serão vinculadas ao projeto escolhido."}
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="gamProjectSelector">
          Projeto
        </label>
        <select
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          id="gamProjectSelector"
          onChange={(event) => handleProjectChange(event.target.value)}
          value={selectedProjectId}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} — {project.domain}
            </option>
          ))}
        </select>

        <form className="mt-6 space-y-5" onSubmit={handleCreate}>
          <input readOnly name="projectId" type="hidden" value={selectedProjectId} />
          <GamConnectionFields mode="create" />
          {error ? (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <Button className="w-full" disabled={isPending || !selectedProjectId} type="submit">
            <Plus size={18} />
            {isPending ? "Salvando..." : "Cadastrar conexão"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-400">Conexões cadastradas</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {connections.length} {connections.length === 1 ? "conexão" : "conexões"}
            </h2>
          </div>
          <Badge>Sem sincronização</Badge>
        </div>

        <div className="mt-6 space-y-4">
          {connections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <h3 className="text-xl font-semibold text-white">Nenhuma conexão GAM cadastrada</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Cadastre uma conexão para preparar relatórios ActiveView/GAM futuros.
                Nenhuma sincronização será executada nesta etapa.
              </p>
            </div>
          ) : (
            connections.map((connection) => (
              <article
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                key={connection.id}
              >
                {editingConnectionId === connection.id ? (
                  <form
                    className="space-y-5"
                    onSubmit={(event) => handleUpdate(event, connection.id)}
                  >
                    <input readOnly name="projectId" type="hidden" value={selectedProjectId} />
                    <GamConnectionFields connection={connection} mode="edit" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button onClick={() => setEditingConnectionId(null)} type="button" variant="ghost">
                        <X size={18} />
                        Cancelar
                      </Button>
                      <Button disabled={isPending} type="submit">
                        {isPending ? "Salvando..." : "Salvar alterações"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">
                          Network {connection.networkCode}
                        </h3>
                        <Badge variant="success">ActiveView/GAM</Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <GamInfo label="Domínio" value={connection.domain} />
                        <GamInfo label="Token" value={connection.authToken} />
                        <GamInfo label="API base" value={connection.apiBaseUrl} />
                        <GamInfo label="Endpoint" value={connection.reportEndpoint} />
                        <GamInfo label="Projeto" value={connection.project.name} />
                        <GamInfo label="Site" value={connection.project.domain} />
                      </dl>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setEditingConnectionId(connection.id)} variant="secondary">
                        <Edit3 size={18} />
                        Editar
                      </Button>
                      <Button
                        disabled={deletingConnectionId === connection.id}
                        onClick={() => handleDelete(connection.id)}
                        variant="danger"
                      >
                        <Trash2 size={18} />
                        {deletingConnectionId === connection.id ? "Removendo..." : "Remover"}
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function buildPayload(formData: FormData, fallbackProjectId: string, includeEmptyToken: boolean) {
  const authToken = String(formData.get("authToken") ?? "").trim();

  return {
    projectId: String(formData.get("projectId") ?? fallbackProjectId),
    networkCode: String(formData.get("networkCode") ?? "").trim(),
    domain: String(formData.get("domain") ?? "").trim(),
    apiBaseUrl: String(formData.get("apiBaseUrl") ?? "").trim(),
    reportEndpoint: String(formData.get("reportEndpoint") ?? "").trim(),
    ...(authToken || includeEmptyToken ? { authToken } : {}),
  };
}

function GamConnectionFields({
  connection,
  mode,
}: {
  connection?: GamConnection;
  mode: "create" | "edit";
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={`${mode}-networkCode`}>
          Network code
        </label>
        <Input
          required
          defaultValue={connection?.networkCode}
          id={`${mode}-networkCode`}
          name="networkCode"
          placeholder="123456789"
          type="text"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={`${mode}-domain`}>
          Domínio
        </label>
        <Input
          required
          defaultValue={connection?.domain}
          id={`${mode}-domain`}
          name="domain"
          placeholder="exemplo.com.br"
          type="text"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={`${mode}-authToken`}>
          Auth token Bearer
        </label>
        <Input
          required={mode === "create"}
          autoComplete="off"
          id={`${mode}-authToken`}
          name="authToken"
          placeholder={mode === "create" ? "Bearer token" : "Deixe em branco para manter o token atual"}
          type="password"
        />
        <p className="mt-2 text-xs text-slate-500">
          O token é criptografado antes de ser salvo e nunca é exibido novamente.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={`${mode}-apiBaseUrl`}>
          API base URL
        </label>
        <Input
          required
          defaultValue={connection?.apiBaseUrl}
          id={`${mode}-apiBaseUrl`}
          name="apiBaseUrl"
          placeholder="https://api.example.com"
          type="url"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor={`${mode}-reportEndpoint`}>
          Report endpoint
        </label>
        <Input
          required
          defaultValue={connection?.reportEndpoint}
          id={`${mode}-reportEndpoint`}
          name="reportEndpoint"
          placeholder="/reports/activeview"
          type="text"
        />
      </div>
    </div>
  );
}

function GamInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={label === "Token" ? "mt-1 truncate font-semibold tracking-[0.25em] text-slate-200" : "mt-1 truncate font-semibold text-slate-200"}>
        {label === "Token" ? maskedToken : value}
      </dd>
    </div>
  );
}
