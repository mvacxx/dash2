import { PageContainer } from "@/components/dashboard/page-container";

export default function MappingsLoading() {
  return (
    <PageContainer>
      <div className="h-8 w-36 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-10 w-80 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
    </PageContainer>
  );
}
