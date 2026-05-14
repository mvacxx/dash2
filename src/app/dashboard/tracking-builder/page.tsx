import { MousePointerClick } from "lucide-react";

import { PageContainer } from "@/components/dashboard/page-container";
import { TrackingBuilder } from "@/components/tracking/tracking-builder";
import { Badge } from "@/components/ui/badge";

export default function TrackingBuilderPage() {
  return (
    <PageContainer>
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-slate-950/30 md:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <Badge variant="success">Tracking Builder</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
              Gerador de URLs para Meta Ads
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Monte URLs com UTMs e macros do Meta Ads para preparar o rastreamento
              de campanhas. Esta ferramenta apenas gera links; não cria integrações
              nem sincroniza dados externos.
            </p>
          </div>
          <div className="rounded-3xl border border-indigo-300/20 bg-indigo-400/10 p-4">
            <MousePointerClick className="text-indigo-200" size={30} />
          </div>
        </div>
      </section>

      <TrackingBuilder />
    </PageContainer>
  );
}
