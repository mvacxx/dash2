import { PageContainer } from "@/components/dashboard/page-container";

export default function ProjectsLoading() {
  return (
    <PageContainer>
      <div className="h-8 w-32 animate-pulse rounded-full bg-white/10" />
      <div className="mt-4 h-10 w-72 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" key={item} />
        ))}
      </div>
    </PageContainer>
  );
}
