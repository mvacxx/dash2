import { RefreshCw } from "lucide-react";

import { PageContainer } from "@/components/dashboard/page-container";

export default function DashboardLoading() {
  return (
    <PageContainer>
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-slate-200">
        <div className="flex items-center gap-3">
          <RefreshCw className="animate-spin text-indigo-200" size={20} />
          <span className="text-sm font-medium">Sincronizando...</span>
        </div>
      </div>
    </PageContainer>
  );
}
