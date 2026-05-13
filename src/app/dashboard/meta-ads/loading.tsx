import { PageContainer } from "@/components/dashboard/page-container";

export default function MetaAdsLoading() {
  return (
    <PageContainer>
      <div className="h-8 w-28 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-10 w-80 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
    </PageContainer>
  );
}
