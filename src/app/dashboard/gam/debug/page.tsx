import { Bug, DatabaseZap } from "lucide-react";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageContainer } from "@/components/dashboard/page-container";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function GamSyncDebugPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login?callbackUrl=/dashboard/gam/debug");
  }

  const [lastSync, rowCount, sampleRows] = await Promise.all([
    prisma.syncLog.findFirst({
      where: {
        userId,
        source: "ACTIVEVIEW",
      },
      orderBy: {
        startedAt: "desc",
      },
      select: {
        finishedAt: true,
        message: true,
        startedAt: true,
        status: true,
      },
    }),
    prisma.gamRevenueRow.count({
      where: {
        userId,
      },
    }),
    prisma.gamRevenueRow.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        adUnit: true,
        country: true,
        createdAt: true,
        date: true,
        domain: true,
        networkCode: true,
        rawJson: true,
        revenueGross: true,
        revenueNet: true,
      },
    }),
  ]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30 md:p-8">
          <Badge variant="success">Debug GAM / ActiveView</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Debug da sincronização
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Confira a última execução, quantidade de linhas persistidas no banco
            local e uma amostra do payload salvo em <code>GamRevenueRow</code>.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <DebugCard
            label="Última sync"
            value={lastSync ? formatDateTime(lastSync.startedAt) : "Nunca"}
          />
          <DebugCard label="Status" value={lastSync?.status ?? "Sem sync"} />
          <DebugCard label="Rows locais" value={String(rowCount)} />
        </section>

        {lastSync?.message ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-300">
            <div className="mb-3 flex items-center gap-2 text-white">
              <Bug size={18} />
              <h2 className="font-semibold">Resumo da última sync</h2>
            </div>
            <p className="leading-6">{lastSync.message}</p>
            {lastSync.finishedAt ? (
              <p className="mt-3 text-xs text-slate-500">
                Finalizada em {formatDateTime(lastSync.finishedAt)}
              </p>
            ) : null}
          </section>
        ) : null}

        {sampleRows.length === 0 ? (
          <EmptyState
            badge="Sem rows locais"
            description="Execute POST /api/sync/trigger ou clique em Sincronizar agora para gravar rows e visualizar o sample da response."
            icon={DatabaseZap}
            title="Nenhum sample disponível"
          />
        ) : (
          <section className="space-y-4">
            {sampleRows.map((row, index) => (
              <article
                className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/20"
                key={`${row.networkCode}-${row.domain}-${row.date.toISOString()}-${index}`}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Sample #{index + 1}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {row.domain} · {row.networkCode}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDate(row.date)} · Ad unit: {row.adUnit || "—"} ·
                      País: {row.country || "—"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p>Gross: {formatCurrency(row.revenueGross)}</p>
                    <p>Net: {formatCurrency(row.revenueNet)}</p>
                  </div>
                </div>
                <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-slate-300">
                  {JSON.stringify(row.rawJson, null, 2)}
                </pre>
              </article>
            ))}
          </section>
        )}
      </div>
    </PageContainer>
  );
}

function DebugCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-slate-950/20">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
