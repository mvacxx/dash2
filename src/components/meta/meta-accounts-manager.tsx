"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  name: string;
  domain: string;
};

type MetaAccount = {
  id: string;
  projectId: string;
  label: string;
  adAccountId: string;
  accessToken: string;
  connectionType: "META_API" | "MANUAL";
  createdAt: string;
  updatedAt: string;
  project: ProjectOption;
};

type MetaAccountsManagerProps = {
  projects: ProjectOption[];
  accounts: MetaAccount[];
  selectedProjectId: string;
};

type ApiResponse = {
  message?: string;
  result?: {
    count: number;
  };
};

const connectionTypes = [
  {
    label: "Meta API",
    value: "META_API",
  },
  {
    label: "Manual",
    value: "MANUAL",
  },
];

export function MetaAccountsManager({
  projects,
  accounts,
  selectedProjectId,
}: MetaAccountsManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const defaultSyncDateRange = useMemo(() => getDefaultDateRange(), []);

  function handleProjectChange(projectId: string) {
    router.push(`/dashboard/meta-ads?projectId=${projectId}`);
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = buildPayload(formData, selectedProjectId, true);

    startTransition(async () => {
      const response = await fetch("/api/meta/accounts", {
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
        setError(data?.message ?? "Não foi possível criar a conta Meta Ads.");
        return;
      }

      resetCreateForm(form);
      router.refresh();
    });
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    accountId: string,
  ) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = buildPayload(formData, selectedProjectId, false);

    startTransition(async () => {
      const response = await fetch(`/api/meta/accounts/${accountId}`, {
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
        setError(
          data?.message ?? "Não foi possível atualizar a conta Meta Ads.",
        );
        return;
      }

      setEditingAccountId(null);
      router.refresh();
    });
  }

  function handleDelete(accountId: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja remover esta conta Meta Ads?",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingAccountId(accountId);

    startTransition(async () => {
      const response = await fetch(`/api/meta/accounts/${accountId}`, {
        method: "DELETE",
      });
      const data = (await response
        .json()
        .catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível remover a conta Meta Ads.");
        setDeletingAccountId(null);
        return;
      }

      setDeletingAccountId(null);
      router.refresh();
    });
  }

  async function handleSync(
    event: FormEvent<HTMLFormElement>,
    accountId: string,
  ) {
    event.preventDefault();
    setError(null);
    setSyncSuccess(null);
    setSyncingAccountId(accountId);

    const formData = new FormData(event.currentTarget);
    const payload = {
      projectId: selectedProjectId,
      metaAccountId: accountId,
      dateFrom: String(formData.get("dateFrom") ?? ""),
      dateTo: String(formData.get("dateTo") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/meta/sync", {
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
        setError(
          data?.message ?? "Não foi possível sincronizar a Meta Ads API.",
        );
        setSyncingAccountId(null);
        return;
      }

      setSyncSuccess(
        `${data?.result?.count ?? 0} insight(s) sincronizado(s) com sucesso.`,
      );
      setSyncingAccountId(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="success">Projeto selecionado</Badge>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              {selectedProject?.name ?? "Selecione um projeto"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {selectedProject?.domain ??
                "As contas Meta Ads serão vinculadas ao projeto escolhido."}
            </p>
          </div>
        </div>

        <label
          className="mt-6 block text-sm font-medium text-slate-200"
          htmlFor="projectSelector"
        >
          Projeto
        </label>
        <select
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          id="projectSelector"
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
          <MetaAccountFields mode="create" />
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
            {isPending ? "Salvando..." : "Cadastrar conta Meta"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Contas cadastradas
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
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

          {accounts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <h3 className="text-xl font-semibold text-white">
                Nenhuma conta Meta Ads cadastrada
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Cadastre uma conta Meta API para sincronizar campanhas e
                insights reais da Meta Ads API.
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <article
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                key={account.id}
              >
                {editingAccountId === account.id ? (
                  <form
                    className="space-y-5"
                    onSubmit={(event) => handleUpdate(event, account.id)}
                  >
                    <input
                      readOnly
                      name="projectId"
                      type="hidden"
                      value={selectedProjectId}
                    />
                    <MetaAccountFields account={account} mode="edit" />
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button
                        onClick={() => setEditingAccountId(null)}
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
                          {account.label}
                        </h3>
                        <Badge
                          variant={
                            account.connectionType === "META_API"
                              ? "success"
                              : "warning"
                          }
                        >
                          {account.connectionType === "META_API"
                            ? "Meta API"
                            : "Manual"}
                        </Badge>
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <MetaInfo
                          label="Ad account"
                          value={account.adAccountId}
                        />
                        <MetaInfo label="Token" value={account.accessToken} />
                        <MetaInfo
                          label="Projeto"
                          value={account.project.name}
                        />
                        <MetaInfo
                          label="Domínio"
                          value={account.project.domain}
                        />
                      </dl>
                    </div>
                    <div className="flex flex-col gap-3 lg:min-w-72">
                      <form
                        className="rounded-2xl border border-white/10 bg-slate-950/50 p-3"
                        onSubmit={(event) => handleSync(event, account.id)}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Sincronizar insights
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
                            isPending ||
                            syncingAccountId === account.id ||
                            account.connectionType !== "META_API"
                          }
                          type="submit"
                          variant="secondary"
                        >
                          <RefreshCw size={18} />
                          {syncingAccountId === account.id
                            ? "Sincronizando..."
                            : "Sincronizar"}
                        </Button>
                      </form>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingAccountId(account.id)}
                          variant="secondary"
                        >
                          <Edit3 size={18} />
                          Editar
                        </Button>
                        <Button
                          disabled={deletingAccountId === account.id}
                          onClick={() => handleDelete(account.id)}
                          variant="danger"
                        >
                          <Trash2 size={18} />
                          {deletingAccountId === account.id
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
  const accessToken = String(formData.get("accessToken") ?? "").trim();
  const payload = {
    projectId: String(formData.get("projectId") ?? fallbackProjectId),
    label: String(formData.get("label") ?? "").trim(),
    adAccountId: String(formData.get("adAccountId") ?? "").trim(),
    connectionType: String(formData.get("connectionType") ?? "META_API"),
    ...(accessToken || includeEmptyToken ? { accessToken } : {}),
  };

  return payload;
}

function MetaAccountFields({
  account,
  mode,
}: {
  account?: MetaAccount;
  mode: "create" | "edit";
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-label`}
        >
          Nome da conta
        </label>
        <Input
          required
          defaultValue={account?.label}
          id={`${mode}-label`}
          minLength={2}
          name="label"
          placeholder="Ex: Conta principal Meta Ads"
          type="text"
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-adAccountId`}
        >
          Ad Account ID
        </label>
        <Input
          required
          defaultValue={account?.adAccountId}
          id={`${mode}-adAccountId`}
          name="adAccountId"
          placeholder="act_123456789"
          type="text"
        />
      </div>

      <div>
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-connectionType`}
        >
          Tipo de conexão
        </label>
        <select
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          defaultValue={account?.connectionType ?? "META_API"}
          id={`${mode}-connectionType`}
          name="connectionType"
        >
          {connectionTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label
          className="mb-2 block text-sm font-medium text-slate-200"
          htmlFor={`${mode}-accessToken`}
        >
          Access token
        </label>
        <Input
          required={mode === "create"}
          autoComplete="off"
          id={`${mode}-accessToken`}
          name="accessToken"
          placeholder={
            mode === "create"
              ? "Token de acesso Meta"
              : "Deixe em branco para manter o token atual"
          }
          type="password"
        />
        <p className="mt-2 text-xs text-slate-500">
          O token é criptografado antes de ser salvo e nunca é exibido
          novamente.
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

function MetaInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={cn(
          "mt-1 truncate font-semibold text-slate-200",
          label === "Token" && "tracking-[0.25em]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
