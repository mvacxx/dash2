import {
  BarChart3,
  CircleDollarSign,
  DatabaseZap,
  FolderKanban,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/dashboard/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageContainer } from "@/components/dashboard/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SyncNowButton } from "@/components/gam/sync-now-button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const baseMetrics = [
  {
    title: "Projetos ativos",
    value: "0",
    description: "Nenhum projeto foi criado nesta fundação inicial.",
    icon: FolderKanban,
    badge: "Sem dados",
  },
  {
    title: "Campanhas Meta Ads",
    value: "0",
    description: "Contas e insights manuais já podem ser cadastrados.",
    icon: MousePointerClick,
    badge: "Manual",
  },
  {
    title: "Receita GAM / ActiveView",
    value: "R$ 0,00",
    description: "Receitas manuais já podem ser usadas para testes.",
    icon: CircleDollarSign,
    badge: "Manual",
  },
  {
    title: "ROI consolidado",
    value: "Disponível",
    description: "Relatório por campanha disponível com dados manuais.",
    icon: TrendingUp,
    badge: "Operacional",
  },
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const firstName =
    session?.user?.name?.split(" ")[0] ?? session?.user?.email ?? "usuário";
  const projectCount = userId
    ? await prisma.project.count({
        where: {
          userId,
        },
      })
    : 0;
  const activeViewRevenue = userId
    ? await prisma.gamRevenueDaily.aggregate({
        where: {
          userId,
        },
        _sum: {
          revenue: true,
        },
      })
    : null;
  const metrics = baseMetrics.map((metric) => {
    if (metric.title === "Projetos ativos") {
      return {
        ...metric,
        value: String(projectCount),
        description:
          projectCount === 0
            ? "Nenhum projeto foi criado nesta fundação inicial."
            : "Projetos criados para receber dados futuros.",
      };
    }

    if (metric.title === "Receita GAM / ActiveView") {
      return {
        ...metric,
        value: formatCurrency(activeViewRevenue?._sum.revenue ?? 0),
        description:
          "Receita lida apenas do banco local.",
        badge: "Banco local",
      };
    }

    return metric;
  });

  return (
    <PageContainer>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-slate-950/30">
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-32 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <Badge variant="success">Dashboard protegido</Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Bem-vindo, {firstName}.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
              Esta é a base visual do Dashzada ROI. Projetos, Meta Ads, GAM /
              ActiveView, Mapeamentos, Tracking Builder e ROI já aceitam dados
              manuais para validar o cálculo antes das integrações reais.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard/roi">
                <Button className="sm:w-auto" type="button">
                  <BarChart3 size={18} />
                  Ver ROI por campanha
                </Button>
              </Link>
              <SyncNowButton />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            badge={metric.badge}
            description={metric.description}
            icon={metric.icon}
            key={metric.title}
            title={metric.title}
            value={metric.value}
          />
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <EmptyState
          badge="Sem integrações configuradas"
          description="Quando as próximas etapas forem implementadas, este espaço poderá receber gráficos, tabelas e comparativos. Por enquanto, ele comunica que ainda não há dados reais carregados."
          icon={DatabaseZap}
          title="Nenhum dado disponível no momento"
        />

        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Próximos módulos
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Roadmap visual
              </h2>
            </div>
            <Badge>Planejado</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {[
              "Integrações reais Meta Ads",
              "Integrações reais GAM / ActiveView",
            ].map((item) => (
              <div
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                key={item}
              >
                <span className="text-sm font-medium text-slate-200">
                  {item}
                </span>
                <Badge variant="warning">Em breve</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageContainer>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}
