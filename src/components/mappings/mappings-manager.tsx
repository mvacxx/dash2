"use client";

import { FormEvent, useMemo, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Link2, Plus, Trash2, X } from "lucide-react";

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

type GamConnectionOption = {
  id: string;
  networkCode: string;
  domain: string;
};

type CampaignMapping = {
  id: string;
  projectId: string;
  metaAccountId: string;
  gamConnectionId: string;
  facebookCampaignId: string;
  facebookCampaignName: string;
  trackingType: TrackingType;
  activeViewFieldOne: string;
  activeViewValueOne: string;
  activeViewFieldTwo?: string | null;
  activeViewValueTwo?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectOption;
  metaAccount: MetaAccountOption;
  gamConnection: GamConnectionOption;
};

type TrackingType = "UTM_CAMPAIGN" | "CAMPAIGN_ID" | "AD_ID" | "ADSET_ID" | "CUSTOM";

type MappingsManagerProps = {
  projects: ProjectOption[];
  metaAccounts: MetaAccountOption[];
  gamConnections: GamConnectionOption[];
  mappings: CampaignMapping[];
  selectedProjectId: string;
};

type ApiResponse = {
  message?: string;
};

const trackingTypeOptions: Array<{ label: string; value: TrackingType }> = [
  {
    label: "UTM Campaign",
    value: "UTM_CAMPAIGN",
  },
  {
    label: "Campaign ID",
    value: "CAMPAIGN_ID",
  },
  {
    label: "Ad ID",
    value: "AD_ID",
  },
  {
    label: "Adset ID",
    value: "ADSET_ID",
  },
  {
    label: "Custom",
    value: "CUSTOM",
  },
];

export function MappingsManager({
  gamConnections,
  mappings,
  metaAccounts,
  projects,
  selectedProjectId,
}: MappingsManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);
  const [createCampaignId, setCreateCampaignId] = useState("");
  const [createFieldOne, setCreateFieldOne] = useState("");
  const [createValueOne, setCreateValueOne] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );
  const canCreate = metaAccounts.length > 0 && gamConnections.length > 0;

  function handleProjectChange(projectId: string) {
    router.push(`/dashboard/mappings?projectId=${projectId}`);
  }

  function handleCreateCampaignIdChange(event: ChangeEvent<HTMLInputElement>) {
    const campaignId = event.target.value;

    setCreateCampaignId(campaignId);

    if (!createFieldOne || createFieldOne === "utm_campaign") {
      setCreateFieldOne("utm_campaign");
    }

    if (!createValueOne || createValueOne === createCampaignId) {
      setCreateValueOne(campaignId);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const payload = buildPayload(new FormData(form), selectedProjectId);

    startTransition(async () => {
      const response = await fetch("/api/mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível criar o mapeamento.");
        return;
      }

      form.reset();
      setCreateCampaignId("");
      setCreateFieldOne("");
      setCreateValueOne("");
      router.refresh();
    });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, mappingId: string) {
    event.preventDefault();
    setError(null);

    const payload = buildPayload(new FormData(event.currentTarget), selectedProjectId);

    startTransition(async () => {
      const response = await fetch(`/api/mappings/${mappingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível atualizar o mapeamento.");
        return;
      }

      setEditingMappingId(null);
      router.refresh();
    });
  }

  function handleDelete(mappingId: string) {
    const confirmed = window.confirm("Tem certeza que deseja remover este mapeamento?");

    if (!confirmed) {
      return;
    }

    setError(null);
    setDeletingMappingId(mappingId);

    startTransition(async () => {
      const response = await fetch(`/api/mappings/${mappingId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível remover o mapeamento.");
        setDeletingMappingId(null);
        return;
      }

      setDeletingMappingId(null);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <Badge variant="success">Projeto selecionado</Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
          {selectedProject?.name ?? "Selecione um projeto"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {selectedProject?.domain ?? "Os mapeamentos serão vinculados ao projeto escolhido."}
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-200" htmlFor="mappingProjectSelector">
          Projeto
        </label>
        <select
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          id="mappingProjectSelector"
          onChange={(event) => handleProjectChange(event.target.value)}
          value={selectedProjectId}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} — {project.domain}
            </option>
          ))}
        </select>

        {!canCreate ? (
          <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
            Cadastre pelo menos uma conta Meta Ads e uma conexão GAM / ActiveView
            neste projeto antes de criar mapeamentos.
          </div>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={handleCreate}>
          <input readOnly name="projectId" type="hidden" value={selectedProjectId} />
          <MappingFields
            campaignId={createCampaignId}
            fieldOne={createFieldOne}
            gamConnections={gamConnections}
            metaAccounts={metaAccounts}
            onCampaignIdChange={handleCreateCampaignIdChange}
            onFieldOneChange={(event) => setCreateFieldOne(event.target.value)}
            onValueOneChange={(event) => setCreateValueOne(event.target.value)}
            valueOne={createValueOne}
          />
          {error ? (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <Button className="w-full" disabled={isPending || !canCreate} type="submit">
            <Plus size={18} />
            {isPending ? "Salvando..." : "Criar mapeamento"}
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-400">Mapeamentos cadastrados</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {mappings.length} {mappings.length === 1 ? "mapeamento" : "mapeamentos"}
            </h2>
          </div>
          <Badge>Sem ROI ainda</Badge>
        </div>

        <div className="mt-6 space-y-4">
          {mappings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <h3 className="text-xl font-semibold text-white">Nenhum mapeamento cadastrado</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                Vincule campanhas Meta Ads aos campos ActiveView/GAM para preparar
                a etapa futura de comparação e ROI.
              </p>
            </div>
          ) : (
            mappings.map((mapping) => (
              <article
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                key={mapping.id}
              >
                {editingMappingId === mapping.id ? (
                  <form className="space-y-5" onSubmit={(event) => handleUpdate(event, mapping.id)}>
                    <input readOnly name="projectId" type="hidden" value={selectedProjectId} />
                    <MappingFields
                      gamConnections={gamConnections}
                      mapping={mapping}
                      metaAccounts={metaAccounts}
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button onClick={() => setEditingMappingId(null)} type="button" variant="ghost">
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
                          {mapping.facebookCampaignName}
                        </h3>
                        <Badge variant="success">{formatTrackingType(mapping.trackingType)}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">
                        Campaign ID: {mapping.facebookCampaignId}
                      </p>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <MappingInfo label="Meta" value={mapping.metaAccount.label} />
                        <MappingInfo label="GAM" value={mapping.gamConnection.networkCode} />
                        <MappingInfo label={mapping.activeViewFieldOne} value={mapping.activeViewValueOne} />
                        {mapping.activeViewFieldTwo && mapping.activeViewValueTwo ? (
                          <MappingInfo label={mapping.activeViewFieldTwo} value={mapping.activeViewValueTwo} />
                        ) : null}
                      </dl>
                      {mapping.notes ? (
                        <p className="mt-4 text-sm leading-6 text-slate-500">{mapping.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setEditingMappingId(mapping.id)} variant="secondary">
                        <Edit3 size={18} />
                        Editar
                      </Button>
                      <Button
                        disabled={deletingMappingId === mapping.id}
                        onClick={() => handleDelete(mapping.id)}
                        variant="danger"
                      >
                        <Trash2 size={18} />
                        {deletingMappingId === mapping.id ? "Removendo..." : "Remover"}
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

function buildPayload(formData: FormData, fallbackProjectId: string) {
  return {
    projectId: String(formData.get("projectId") ?? fallbackProjectId),
    metaAccountId: String(formData.get("metaAccountId") ?? ""),
    gamConnectionId: String(formData.get("gamConnectionId") ?? ""),
    facebookCampaignId: String(formData.get("facebookCampaignId") ?? "").trim(),
    facebookCampaignName: String(formData.get("facebookCampaignName") ?? "").trim(),
    trackingType: String(formData.get("trackingType") ?? "UTM_CAMPAIGN"),
    activeViewFieldOne: String(formData.get("activeViewFieldOne") ?? "").trim(),
    activeViewValueOne: String(formData.get("activeViewValueOne") ?? "").trim(),
    activeViewFieldTwo: String(formData.get("activeViewFieldTwo") ?? "").trim() || undefined,
    activeViewValueTwo: String(formData.get("activeViewValueTwo") ?? "").trim() || undefined,
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

function MappingFields({
  campaignId,
  fieldOne,
  gamConnections,
  mapping,
  metaAccounts,
  onCampaignIdChange,
  onFieldOneChange,
  onValueOneChange,
  valueOne,
}: {
  campaignId?: string;
  fieldOne?: string;
  gamConnections: GamConnectionOption[];
  mapping?: CampaignMapping;
  metaAccounts: MetaAccountOption[];
  onCampaignIdChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onFieldOneChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueOneChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  valueOne?: string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="metaAccountId">
          Conta Meta Ads
        </label>
        <select
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          defaultValue={mapping?.metaAccountId ?? metaAccounts[0]?.id ?? ""}
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

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="gamConnectionId">
          Conexão GAM
        </label>
        <select
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          defaultValue={mapping?.gamConnectionId ?? gamConnections[0]?.id ?? ""}
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

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="facebookCampaignId">
          Facebook campaign ID
        </label>
        <Input
          required
          {...(campaignId === undefined
            ? { defaultValue: mapping?.facebookCampaignId }
            : { value: campaignId })}
          id="facebookCampaignId"
          name="facebookCampaignId"
          onChange={onCampaignIdChange}
          placeholder="123456789"
          type="text"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="facebookCampaignName">
          Facebook campaign name
        </label>
        <Input
          required
          defaultValue={mapping?.facebookCampaignName}
          id="facebookCampaignName"
          name="facebookCampaignName"
          placeholder="Campanha Black Friday"
          type="text"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="trackingType">
          Tracking type
        </label>
        <select
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          defaultValue={mapping?.trackingType ?? "UTM_CAMPAIGN"}
          id="trackingType"
          name="trackingType"
        >
          {trackingTypeOptions.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="activeViewFieldOne">
          ActiveView field 1
        </label>
        <Input
          required
          {...(fieldOne === undefined
            ? { defaultValue: mapping?.activeViewFieldOne }
            : { value: fieldOne })}
          id="activeViewFieldOne"
          name="activeViewFieldOne"
          onChange={onFieldOneChange}
          placeholder="utm_campaign"
          type="text"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="activeViewValueOne">
          ActiveView value 1
        </label>
        <Input
          required
          {...(valueOne === undefined
            ? { defaultValue: mapping?.activeViewValueOne }
            : { value: valueOne })}
          id="activeViewValueOne"
          name="activeViewValueOne"
          onChange={onValueOneChange}
          placeholder="123456789"
          type="text"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="activeViewFieldTwo">
          ActiveView field 2
        </label>
        <Input
          defaultValue={mapping?.activeViewFieldTwo ?? ""}
          id="activeViewFieldTwo"
          name="activeViewFieldTwo"
          placeholder="custom_field"
          type="text"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="activeViewValueTwo">
          ActiveView value 2
        </label>
        <Input
          defaultValue={mapping?.activeViewValueTwo ?? ""}
          id="activeViewValueTwo"
          name="activeViewValueTwo"
          placeholder="valor opcional"
          type="text"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="notes">
          Observações
        </label>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
          defaultValue={mapping?.notes ?? ""}
          id="notes"
          name="notes"
          placeholder="Contexto adicional para este mapeamento"
        />
      </div>
    </div>
  );
}

function MappingInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

function formatTrackingType(trackingType: TrackingType) {
  return trackingType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
