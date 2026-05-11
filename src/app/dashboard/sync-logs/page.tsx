import { Activity, Clock3 } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sourceLabels: Record<string, string> = {
  META: "Meta Ads",
  ACTIVEVIEW: "GAM / ActiveView",
  ROI: "ROI",
};

const statusLabels: Record<string, string> = {
  SUCCESS: "Sucesso",
  ERROR: "Erro",
  RUNNING: "Em execução",
};

const statusBadgeVariant: Record<string, "default" | "success" | "warning"> = {
  SUCCESS: "success",
  ERROR: "warning",
  RUNNING: "default",
};

export default async function SyncLogsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/sync-logs");
  }

  const logs = await prisma.syncLog.findMany({
    where: {
      userId,
    },
    include: {
      project: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 100,
  });

  return (
    <PageContainer>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge variant="success">Logs de sincronização</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Histórico de sincronizações
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Acompanhe as execuções de Meta Ads, GAM / ActiveView e ROI por data,
            fonte, status, mensagem e duração.
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            badge="Nenhum log criado"
            description="Execute uma sincronização de Meta Ads ou GAM / ActiveView para registrar o histórico operacional neste painel."
            icon={Activity}
            title="Sem sincronizações registradas"
          />
        </div>
      ) : (
        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-xl shadow-slate-950/20">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Data</th>
                  <th className="px-5 py-4 font-semibold">Projeto</th>
                  <th className="px-5 py-4 font-semibold">Fonte</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Mensagem</th>
                  <th className="px-5 py-4 font-semibold">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.map((log) => (
                  <tr className="text-slate-300" key={log.id}>
                    <td className="whitespace-nowrap px-5 py-4 align-top font-medium text-white">
                      {formatDateTime(log.startedAt)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top text-slate-400">
                      {log.project.name}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top">
                      {sourceLabels[log.source] ?? log.source}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top">
                      <Badge
                        variant={statusBadgeVariant[log.status] ?? "default"}
                      >
                        {statusLabels[log.status] ?? log.status}
                      </Badge>
                    </td>
                    <td className="min-w-72 px-5 py-4 align-top text-slate-400">
                      {log.message ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 align-top text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={15} />
                        {formatDuration(log.startedAt, log.finishedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PageContainer>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatDuration(startedAt: Date, finishedAt: Date | null) {
  const end = finishedAt ?? new Date();
  const durationMs = Math.max(end.getTime() - startedAt.getTime(), 0);
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
