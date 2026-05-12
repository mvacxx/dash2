import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  ChartNoAxesCombined,
  CircleDollarSign,
  Percent,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { RoiPerformanceChart } from "@/components/dashboard/roi-performance-chart";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGamRevenue } from "@/services/gam-auto-sync";
import {
  generateCampaignRoiReport,
  type CampaignRoiReportRow,
  type CampaignRoiStatus,
} from "@/services/roi-service";

type RoiPageProps = {
  searchParams?: Promise<{
    projectId?: string;
    metaAccountId?: string;
    dateFrom?: string;
    dateTo?: string;
    preset?: DatePreset;
  }>;
};

type DatePreset = "today" | "yesterday" | "last7" | "thisMonth" | "custom";

type MetricTone = "neutral" | "positive" | "negative" | "warning" | "info";

const presetLabels: Record<DatePreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "Últimos 7 dias",
  thisMonth: "Este mês",
  custom: "Personalizado",
};

const statusLabels: Record<CampaignRoiStatus, string> = {
  UNMAPPED: "UNMAPPED",
  NO_REVENUE: "NO_REVENUE",
  PROFIT: "PROFIT",
  LOSS: "LOSS",
  BREAK_EVEN: "BREAK_EVEN",
};

const statusClasses: Record<CampaignRoiStatus, string> = {
  PROFIT:
    "border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-emerald-950/20",
  LOSS: "border-rose-300/25 bg-rose-400/10 text-rose-100 shadow-rose-950/20",
  UNMAPPED:
    "border-slate-400/20 bg-slate-400/10 text-slate-200 shadow-slate-950/20",
  NO_REVENUE: "border-red-300/25 bg-red-500/10 text-red-100 shadow-red-950/20",
  BREAK_EVEN:
    "border-amber-300/25 bg-amber-400/10 text-amber-100 shadow-amber-950/20",
};

export default async function RoiPage({ searchParams }: RoiPageProps) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/roi");
  }

  const autoSyncResult = await syncGamRevenue({ userId });

  const params = await searchParams;
  const projects = await prisma.project.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      domain: true,
    },
  });
  const selectedProjectId = projects.some(
    (project) => project.id === params?.projectId,
  )
    ? params?.projectId
    : projects[0]?.id;
  const selectedPreset = isPreset(params?.preset) ? params.preset : "last7";
  const selectedRange = getSelectedDateRange({
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    preset: selectedPreset,
  });

  const metaAccounts = selectedProjectId
    ? await prisma.metaAccount.findMany({
        where: {
          projectId: selectedProjectId,
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          label: true,
          adAccountId: true,
        },
      })
    : [];
  const selectedMetaAccountId = metaAccounts.some(
    (account) => account.id === params?.metaAccountId,
  )
    ? params?.metaAccountId
    : undefined;
  const report = selectedProjectId
    ? await generateCampaignRoiReport({
        userId,
        projectId: selectedProjectId,
        metaAccountId: selectedMetaAccountId,
        dateFrom: parseDateBoundary(selectedRange.dateFrom, "start"),
        dateTo: parseDateBoundary(selectedRange.dateTo, "end"),
      })
    : null;
  const attentionCampaigns = report ? getAttentionCampaigns(report.rows) : [];

  return (
    <PageContainer>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.22),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-6 shadow-2xl shadow-slate-950/40 md:p-8">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <Badge variant="success">Dashboard financeiro</Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                ROI por campanha
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                Acompanhe gasto Meta Ads, receita GAM, lucro líquido, ROI e ROAS
                em um painel premium para validar campanhas com dados manuais
                antes das integrações reais.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-300 shadow-xl shadow-slate-950/20">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Período ativo
              </p>
              <p className="mt-2 font-semibold text-white">
                {formatDate(selectedRange.dateFrom)} —{" "}
                {formatDate(selectedRange.dateTo)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {presetLabels[selectedPreset]}
              </p>
            </div>
          </div>
        </section>

        {autoSyncResult.warning ? (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle size={16} />
            {autoSyncResult.warning}
          </div>
        ) : null}

        {projects.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              badge="Crie um projeto primeiro"
              description="O relatório de ROI precisa de um projeto com insights Meta, receita ActiveView/GAM e mapeamentos de campanha."
              icon={ChartNoAxesCombined}
              title="Nenhum projeto disponível"
            />
            <div className="mt-5 flex justify-center">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-400 hover:to-blue-400"
                href="/dashboard/projects/new"
              >
                <Plus size={18} />
                Criar projeto
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
              <form
                className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1.2fr_auto] lg:items-end"
                method="get"
              >
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-200"
                    htmlFor="projectId"
                  >
                    Projeto
                  </label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                    defaultValue={selectedProjectId}
                    id="projectId"
                    name="projectId"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} — {project.domain}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-200"
                    htmlFor="metaAccountId"
                  >
                    Conta Meta
                  </label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                    defaultValue={selectedMetaAccountId ?? ""}
                    id="metaAccountId"
                    name="metaAccountId"
                  >
                    <option value="">Todas</option>
                    {metaAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="mb-2 block text-sm font-medium text-slate-200"
                    htmlFor="preset"
                  >
                    Período
                  </label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                    defaultValue={selectedPreset}
                    id="preset"
                    name="preset"
                  >
                    {Object.entries(presetLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-400 hover:to-blue-400"
                  type="submit"
                >
                  Aplicar filtros
                </button>
                <div className="grid gap-4 lg:col-span-4 md:grid-cols-2">
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-slate-200"
                      htmlFor="dateFrom"
                    >
                      Data inicial personalizada
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                      defaultValue={selectedRange.dateFrom}
                      id="dateFrom"
                      name="dateFrom"
                      type="date"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block text-sm font-medium text-slate-200"
                      htmlFor="dateTo"
                    >
                      Data final personalizada
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300/70 focus:ring-4 focus:ring-indigo-400/10"
                      defaultValue={selectedRange.dateTo}
                      id="dateTo"
                      name="dateTo"
                      type="date"
                    />
                  </div>
                </div>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(presetLabels) as DatePreset[]).map((preset) => (
                  <Link
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedPreset === preset
                        ? "border-indigo-300/40 bg-indigo-400/15 text-indigo-100"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-indigo-300/30 hover:text-white"
                    }`}
                    href={buildPresetHref({
                      dateFrom: selectedRange.dateFrom,
                      dateTo: selectedRange.dateTo,
                      metaAccountId: selectedMetaAccountId,
                      preset,
                      projectId: selectedProjectId ?? "",
                    })}
                    key={preset}
                  >
                    {presetLabels[preset]}
                  </Link>
                ))}
              </div>
            </section>

            {report ? (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                  <DashboardMetricCard
                    icon={Banknote}
                    label="Valor gasto"
                    tone="info"
                    value={formatCurrency(report.totals.spend)}
                  />
                  <DashboardMetricCard
                    icon={CircleDollarSign}
                    label="Receita GAM"
                    tone="positive"
                    value={formatCurrency(report.totals.revenueGross)}
                  />
                  <DashboardMetricCard
                    icon={
                      report.totals.profit >= 0 ? ArrowUpRight : ArrowDownRight
                    }
                    label="Lucro líquido"
                    tone={report.totals.profit >= 0 ? "positive" : "negative"}
                    value={formatCurrency(report.totals.profit)}
                  />
                  <DashboardMetricCard
                    icon={Percent}
                    label="ROI"
                    tone={report.totals.roi >= 0 ? "positive" : "negative"}
                    value={`${formatNumber(report.totals.roi)}%`}
                  />
                  <DashboardMetricCard
                    icon={Target}
                    label="ROAS"
                    tone="neutral"
                    value={formatNumber(report.totals.roas)}
                  />
                  <DashboardMetricCard
                    icon={TrendingUp}
                    label="Campanhas lucrativas"
                    tone="positive"
                    value={String(report.statusTotals.PROFIT)}
                  />
                  <DashboardMetricCard
                    icon={TrendingDown}
                    label="Campanhas com prejuízo"
                    tone="negative"
                    value={String(report.statusTotals.LOSS)}
                  />
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
                  <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/30">
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <Badge>Performance diária</Badge>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                          Lucro e ROI por dia
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Linhas comparando lucro líquido e ROI no período
                          selecionado.
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />{" "}
                          Lucro
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />{" "}
                          ROI
                        </span>
                      </div>
                    </div>
                    <RoiPerformanceChart data={report.dailyRows} />
                  </div>

                  <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(127,29,29,0.24),rgba(15,23,42,0.86))] p-5 shadow-2xl shadow-slate-950/30">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant="warning">Atenção</Badge>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                          Campanhas que precisam de atenção
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Spend sem receita, ROI negativo ou campanhas sem
                          mapeamento.
                        </p>
                      </div>
                      <AlertTriangle className="text-amber-200" size={24} />
                    </div>
                    <div className="mt-5 space-y-3">
                      {attentionCampaigns.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                          Nenhuma campanha crítica encontrada neste período.
                        </div>
                      ) : (
                        attentionCampaigns.slice(0, 6).map((campaign) => (
                          <div
                            className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                            key={campaign.campaignId}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">
                                  {campaign.campaignName}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {campaign.campaignId}
                                </p>
                              </div>
                              <StatusBadge status={campaign.status} />
                            </div>
                            <p className="mt-3 text-sm text-slate-300">
                              {getAttentionReason(campaign)}
                            </p>
                            <div className="mt-3 flex gap-4 text-xs text-slate-500">
                              <span>
                                Spend {formatCurrency(campaign.spend)}
                              </span>
                              <span>ROI {formatNumber(campaign.roi)}%</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/30">
                  <div className="flex flex-col justify-between gap-3 border-b border-white/10 p-5 md:flex-row md:items-center">
                    <div>
                      <Badge>Campanhas</Badge>
                      <h2 className="mt-3 text-2xl font-semibold text-white">
                        Tabela de ROI por campanha
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Métricas agregadas entre{" "}
                        {formatDate(selectedRange.dateFrom)} e{" "}
                        {formatDate(selectedRange.dateTo)}.
                      </p>
                    </div>
                    <p className="text-sm text-slate-500">
                      {report.rows.length} campanha(s)
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                      <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-4">Campanha</th>
                          <th className="px-4 py-4">Spend</th>
                          <th className="px-4 py-4">Clicks</th>
                          <th className="px-4 py-4">CTR</th>
                          <th className="px-4 py-4">CPC</th>
                          <th className="px-4 py-4">CPM</th>
                          <th className="px-4 py-4">Receita</th>
                          <th className="px-4 py-4">Lucro</th>
                          <th className="px-4 py-4">ROI</th>
                          <th className="px-4 py-4">ROAS</th>
                          <th className="px-4 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-slate-300">
                        {report.rows.length === 0 ? (
                          <tr>
                            <td
                              className="px-4 py-10 text-center text-slate-500"
                              colSpan={11}
                            >
                              Nenhum Meta Insight encontrado para os filtros
                              selecionados.
                            </td>
                          </tr>
                        ) : (
                          report.rows.map((row) => (
                            <tr
                              className="transition hover:bg-white/[0.03]"
                              key={row.campaignId}
                            >
                              <td className="min-w-72 px-4 py-4">
                                <div className="font-medium text-white">
                                  {row.campaignName}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {row.campaignId}
                                </div>
                              </td>
                              <td className="px-4 py-4 font-medium text-white">
                                {formatCurrency(row.spend)}
                              </td>
                              <td className="px-4 py-4">
                                {row.clicks.toLocaleString("pt-BR")}
                              </td>
                              <td className="px-4 py-4">
                                {formatNumber(row.ctr)}%
                              </td>
                              <td className="px-4 py-4">
                                {formatCurrency(row.cpc)}
                              </td>
                              <td className="px-4 py-4">
                                {formatCurrency(row.cpm)}
                              </td>
                              <td className="px-4 py-4 text-emerald-100">
                                {formatCurrency(row.revenueGross)}
                              </td>
                              <td
                                className={
                                  row.profit >= 0
                                    ? "px-4 py-4 text-emerald-200"
                                    : "px-4 py-4 text-rose-200"
                                }
                              >
                                {formatCurrency(row.profit)}
                              </td>
                              <td
                                className={
                                  row.roi >= 0
                                    ? "px-4 py-4 text-emerald-200"
                                    : "px-4 py-4 text-rose-200"
                                }
                              >
                                {formatNumber(row.roi)}%
                              </td>
                              <td className="px-4 py-4">
                                {formatNumber(row.roas)}
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge status={row.status} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  );
}

function DashboardMetricCard({
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  icon: typeof Banknote;
  label: string;
  tone?: MetricTone;
  value: string;
}) {
  const toneClasses: Record<MetricTone, string> = {
    neutral: "from-slate-500/10 to-white/[0.03] text-white ring-white/10",
    positive:
      "from-emerald-500/15 to-white/[0.03] text-emerald-100 ring-emerald-300/20",
    negative: "from-rose-500/15 to-white/[0.03] text-rose-100 ring-rose-300/20",
    warning:
      "from-amber-500/15 to-white/[0.03] text-amber-100 ring-amber-300/20",
    info: "from-indigo-500/15 to-white/[0.03] text-indigo-100 ring-indigo-300/20",
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br p-4 ring-1 shadow-xl shadow-slate-950/20 ${toneClasses[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CampaignRoiStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold shadow-lg ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function getAttentionCampaigns(rows: CampaignRoiReportRow[]) {
  return rows.filter(
    (row) =>
      (row.spend > 0 && row.revenueGross === 0 && row.revenueNet === 0) ||
      row.roi < 0 ||
      row.status === "UNMAPPED",
  );
}

function getAttentionReason(row: CampaignRoiReportRow) {
  if (row.status === "UNMAPPED") {
    return "Campanha sem mapeamento entre Meta Ads e ActiveView/GAM.";
  }

  if (row.spend > 0 && row.revenueGross === 0 && row.revenueNet === 0) {
    return "Campanha com gasto registrado e nenhuma receita atribuída.";
  }

  if (row.roi < 0) {
    return "Campanha com ROI negativo no período selecionado.";
  }

  return "Campanha requer revisão manual.";
}

function getSelectedDateRange({
  dateFrom,
  dateTo,
  preset,
}: {
  dateFrom?: string;
  dateTo?: string;
  preset: DatePreset;
}) {
  if (preset === "custom" && isDateInput(dateFrom) && isDateInput(dateTo)) {
    return {
      dateFrom,
      dateTo,
    };
  }

  return getPresetDateRange(preset);
}

function getPresetDateRange(preset: DatePreset) {
  const today = new Date();
  const dateFrom = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const dateTo = new Date(dateFrom);

  if (preset === "yesterday") {
    dateFrom.setUTCDate(dateFrom.getUTCDate() - 1);
    dateTo.setUTCDate(dateTo.getUTCDate() - 1);
  }

  if (preset === "last7") {
    dateFrom.setUTCDate(dateFrom.getUTCDate() - 6);
  }

  if (preset === "thisMonth") {
    dateFrom.setUTCDate(1);
  }

  return {
    dateFrom: toDateInputValue(dateFrom),
    dateTo: toDateInputValue(dateTo),
  };
}

function buildPresetHref({
  dateFrom,
  dateTo,
  metaAccountId,
  preset,
  projectId,
}: {
  dateFrom: string;
  dateTo: string;
  metaAccountId?: string;
  preset: DatePreset;
  projectId: string;
}) {
  const params = new URLSearchParams({
    dateFrom,
    dateTo,
    preset,
    projectId,
  });

  if (metaAccountId) {
    params.set("metaAccountId", metaAccountId);
  }

  return `/dashboard/roi?${params.toString()}`;
}

function parseDateBoundary(value: string, boundary: "start" | "end") {
  return new Date(
    `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`,
  );
}

function isPreset(value?: string): value is DatePreset {
  return (
    value === "today" ||
    value === "yesterday" ||
    value === "last7" ||
    value === "thisMonth" ||
    value === "custom"
  );
}

function isDateInput(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}
