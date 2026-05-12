import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
};

export function EmptyState({ icon: Icon, title, description, badge }: EmptyStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center shadow-2xl shadow-slate-950/20">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-300/20 bg-blue-400/10">
        <Icon className="text-blue-200" size={30} />
      </div>
      {badge ? (
        <div className="mt-6">
          <Badge variant="warning">{badge}</Badge>
        </div>
      ) : null}
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
    </section>
  );
}
