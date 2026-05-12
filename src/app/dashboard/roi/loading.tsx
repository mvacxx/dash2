import { PageContainer } from "@/components/dashboard/page-container";

export default function RoiLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              className="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
              key={index}
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        <div className="h-96 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
    </PageContainer>
  );
}
