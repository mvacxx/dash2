"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  createdAt: string;
  updatedAt: string;
  project: ProjectOption;
};

type GamConnectionsManagerProps = {
  projects: ProjectOption[];
  connections: GamConnection[];
  selectedProjectId: string;
};

type GamSyncDebug = {
  url: string;
  domain: string;
  networkCode: string;
  startDate: string;
  endDate: string;
  authorization: "Bearer ***";
  httpStatus: number | null;
  rawResponseSummary: string;
  rowCount: number;
};

type ApiResponse = {
  debug?: GamSyncDebug;
  message?: string;
  result?: {
    count: number;
    debug?: GamSyncDebug;
    message?: string;
  };
};

export function GamConnectionsManager({
  projects,
  connections,
  selectedProjectId,
}: GamConnectionsManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(
    null,
  );
  const [deletingConnectionId, setDeletingConnectionId] = useState<
    string | null
  >(null);
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(
    null,
  );
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncDebug, setSyncDebug] = useState<GamSyncDebug | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const defaultSyncDateRange = useMemo(() => getDefaultDateRange(), []);

  function handleProjectChange(projectId: string) {
    router.push(`/dashboard/gam?projectId=${projectId}`);
  }

  function resetCreateForm(form: HTMLFormElement) {
    form.reset();
    const projectInput = form.elements.namedItem(
      "projectId",
    ) as HTMLInputElement | null;

    if (projectInput) {
      projectInput.value = selectedProjectId;
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setToast(null);

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
      const data = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        const message =
          data?.message ?? "Não foi possível criar a conexão GAM.";
        setError(message);
        setToast({ message, type: "error" });
        return;
      }

      resetCreateForm(form);
      setToast({ message: "Conexão GAM salva com sucesso.", type: "success" });
      router.refresh();
    });
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    connectionId: string,
  ) {
    event.preventDefault();
    setError(null);
    setToast(null);

    const payload = buildPayload(
      new FormData(event.currentTarget),
      selectedProjectId,
      false,
    );

    startTransition(async () => {
      const response = await fetch(`/api/gam/connections/${connectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        const message =
          data?.message ?? "Não foi possível atualizar a conexão GAM.";
        setError(message);
        setToast({ message, type: "error" });
        return;
      }

      setEditingConnectionId(null);
      setToast({
        message: "Conexão GAM atualizada com sucesso.",
        type: "success",
      });
      router.refresh();
    });
  }

  function handleDelete(connectionId: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja remover esta conexão GAM?",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setToast(null);
    setDeletingConnectionId(connectionId);

    startTransition(async () => {
      const response = await fetch(`/api/gam/connections/${connectionId}`, {
        method: "DELETE",
      });
      const data = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        const message =
          data?.message ?? "Não foi possível remover a conexão GAM.";
        setError(message);
        setToast({ message, type: "error" });
        setDeletingConnectionId(null);
        return;
      }

      setDeletingConnectionId(null);
      setToast({
        message: "Conexão GAM removida com sucesso.",
        type: "success",
      });
      router.refresh();
    });
  }

  async function handleSync(
    event: FormEvent<HTMLFormElement>,
    connection: GamConnection,
  ) {
    event.preventDefault();
    setError(null);
    setSyncSuccess(null);
    setSyncDebug(null);
    setToast(null);
    setSyncingConnectionId(connection.id);

    const formData = new FormData(event.currentTarget);
    const payload = {
      projectId: selectedProjectId,
      gamConnectionId: connection.id,
      dateFrom: String(formData.get("dateFrom") ?? ""),
      dateTo: String(formData.get("dateTo") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/gam/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        const message =
          data?.message ?? "Não foi possível sincronizar o relatório GAM.";
        setError(message);
        setSyncDebug(data?.debug ?? null);
        setToast({ message, type: "error" });
        setSyncingConnectionId(null);
        return;
      }

      const syncedRows = data?.result?.count ?? 0;
      const message =
        data?.result?.message ??
        (syncedRows > 0
          ? "Receita sincronizada com sucesso"
          : "Nenhuma receita encontrada para o período");
      const detail = `${message}${syncedRows > 0 ? ` (${syncedRows} linha(s))` : ""}.`;

      setSyncSuccess(detail);
      setSyncDebug(data?.result?.debug ?? null);
      setToast({ message: detail, type: "success" });
      setSyncingConnectionId(null);
      router.refresh();
    });
  }

  return (
    <div className="relative grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      {toast ? (
        <div
          className={cn(
            "fixed right-5 top-5 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur",
            toast.type === "success"
              ? "border-emerald-300/20 bg-emerald-500/15 text-emerald-100 shadow-emerald-950/30"
              : "border-red-300/20 bg-red-500/15 text-red-100 shadow-red-950/30",
          )}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <Badge variant="success">Projeto selecionado</Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          {selectedProject?.name ?? "Selecione um projeto"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {selectedProject?.domain ??
            "As conexões GAM / ActiveView serão vinculadas ao projeto escolhido."}
        </p>

        <label
          className="mt-6 block text-sm font-medium text-slate-200"
          htmlFor="gamProjectSelector"
        >
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
          <input
            readOnly
            name="projectId"
            type="hidden"
            value={selectedProjectId}
          />
          <GamConnectionFields mode="create" />
          {error ? (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <Button
            className="w-full"
            disabled={isPending || !selectedProjectId}
            type="submit"
          >
            <Plus size={18} />
            {isPending ? "Salvando..." : "Cadastrar conexão"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Conexões cadastradas
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {connections.length}{" "}
              {connections.length === 1 ? "conexão" : "conexões"}
            </h2>
          </div>
          <Badge variant="success">Sincronização disponível</Badge>
        </div>

        <div className="mt-6 space-y-4">
          {syncSuccess ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {syncSuccess}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          {syncDebug ? <GamSyncDebugPanel debug={syncDebug} /> : null}

          {connections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <h3 className="text-xl font-semibold text-white">
                Nenhuma conexão GAM cadastrada
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Cadastre uma conexão para sincronizar relatórios ActiveView/GAM
                reais ou inserir receita manual.
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
                    <input
                      readOnly
                      name="projectId"
                      type="hidden"
                      value={selectedProjectId}
                    />
                    <GamConnectionFields connection={connection} mode="edit" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button
                        onClick={() => setEditingConnectionId(null)}
                        type="button"
                        variant="ghost"
                      >
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
                        <GamInfo
                          label="Projeto"
                          value={connection.project.name}
                        />
                        <GamInfo
                          label="Site"
                          value={connection.project.domain}
                        />
                      </dl>
                    </div>
                    <div className="flex flex-col gap-3 lg:min-w-80">
                      <form
                        className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
                        onSubmit={(event) => handleSync(event, connection)}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Sincronizar receita
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="text-xs text-slate-400">
                            De
                            <Input
                              defaultValue={defaultSyncDateRange.dateFrom}
                              name="dateFrom"
                              required
                              type="date"
                            />
                          </label>
                          <label className="text-xs text-slate-400">
                            Até
                            <Input
                              defaultValue={defaultSyncDateRange.dateTo}
                              name="dateTo"
                              required
                              type="date"
                            />
                          </label>
                        </div>
                        <Button
                          className="mt-3 w-full"
                          disabled={
                            isPending || syncingConnectionId === connection.id
                          }
                          type="submit"
                          variant="secondary"
                        >
                          <RefreshCw
                            className={
                              syncingConnectionId === connection.id
                                ? "animate-spin"
                                : undefined
                            }
                            size={18}
                          />
                          {syncingConnectionId === connection.id
                            ? "Sincronizando..."
                            : "Sincronizar"}
                        </Button>
                      </form>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingConnectionId(connection.id)}
                          variant="secondary"
                        >
                          <Edit3 size={18} />
                          Editar
                        </Button>
                        <Button
                          disabled={deletingConnectionId === connection.id}
                          onClick={() => handleDelete(connection.id)}
                          variant="danger"
                        >
                          <Trash2 size={18} />
                          {deletingConnectionId === connection.id
                            ? "Removendo..."
                            : "Remover"}
                        </Button>
                      </div>
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

function buildPayload(
  formData: FormData,
  fallbackProjectId: string,
  includeEmptyToken: boolean,
) {
  const authToken = String(formData.get("authToken") ?? "").trim();

  return {
    projectId: String(formData.get("projectId") ?? fallbackProjectId),
    networkCode: String(formData.get("networkCode") ?? "").trim(),
    domain: String(formData.get("domain") ?? "").trim(),
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
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-networkCode`}
        >
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
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-domain`}
        >
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
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-authToken`}
        >
          Auth token
        </label>
        <Input
          required={mode === "create"}
          autoComplete="off"
          id={`${mode}-authToken`}
          name="authToken"
          placeholder={
            mode === "create"
              ? "Cole o token Bearer ou apenas o token"
              : "Deixe em branco para manter o token atual"
          }
          type="password"
        />
        <p className="mt-2 text-xs text-slate-500">
          Você pode colar com ou sem Bearer. O sistema normaliza
          automaticamente, criptografa o token e nunca exibe o valor novamente.
        </p>
      </div>
    </div>
  );
}

function getDefaultDateRange() {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setUTCDate(dateTo.getUTCDate() - 7);

  return {
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
  };
}

function GamInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={
          label === "Token"
            ? "mt-1 truncate font-semibold tracking-[0.25em] text-slate-200"
            : "mt-1 truncate font-semibold text-slate-200"
        }
      >
        {label === "Token" ? maskedToken : value}
      </dd>
    </div>
  );
}

function GamSyncDebugPanel({ debug }: { debug: GamSyncDebug }) {
  return (
    <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-4 text-sm text-indigo-50">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">Debug da última sincronização</p>
        <span className="text-xs text-indigo-200">
          {debug.rowCount} linha(s) encontrada(s)
        </span>
      </div>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        <DebugItem label="URL chamada" value={debug.url} />
        <DebugItem
          label="Status HTTP"
          value={String(debug.httpStatus ?? "—")}
        />
        <DebugItem label="Domain" value={debug.domain} />
        <DebugItem label="Network code" value={debug.networkCode} />
        <DebugItem label="start_date" value={debug.startDate} />
        <DebugItem label="end_date" value={debug.endDate} />
        <DebugItem label="Authorization" value={debug.authorization} />
      </dl>
      <div className="mt-3 rounded-xl bg-slate-950/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200">
          Resposta bruta resumida
        </p>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-200">
          {debug.rawResponseSummary}
        </pre>
      </div>
    </div>
  );
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-950/50 p-3">
      <dt className="font-semibold text-indigo-200">{label}</dt>
      <dd className="mt-1 break-words text-slate-200">{value}</dd>
    </div>
  );
}
