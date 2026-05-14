import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  className?: string;
};

export function MetricCard({ title, value, description, icon: Icon, badge, className }: MetricCardProps) {
  return (
    <article className={cn("rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/20", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-3">
          <Icon className="text-indigo-200" size={22} />
        </div>
        {badge ? <Badge>{badge}</Badge> : null}
      </div>
      <p className="mt-6 text-sm font-medium text-slate-400">{title}</p>
      <strong className="mt-2 block text-3xl font-bold tracking-tight text-white">{value}</strong>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}
