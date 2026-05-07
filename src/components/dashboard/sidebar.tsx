"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Blocks,
  Building2,
  ChartNoAxesCombined,
  Gauge,
  LayoutDashboard,
  Map,
  Megaphone,
  Settings,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { cn } from "@/lib/utils";

type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projetos",
    href: "/dashboard/projects",
    icon: Building2,
  },
  {
    label: "Meta Ads",
    href: "/dashboard/meta-ads",
    icon: Megaphone,
    disabled: true,
  },
  {
    label: "GAM / ActiveView",
    href: "/dashboard/gam-activeview",
    icon: BarChart3,
    disabled: true,
  },
  {
    label: "Mapeamentos",
    href: "/dashboard/mapeamentos",
    icon: Map,
    disabled: true,
  },
  {
    label: "Tracking Builder",
    href: "/dashboard/tracking-builder",
    icon: Wrench,
    disabled: true,
  },
  {
    label: "ROI",
    href: "/dashboard/roi",
    icon: ChartNoAxesCombined,
    disabled: true,
  },
  {
    label: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings,
    disabled: true,
  },
];

function SidebarLink({ item }: { item: SidebarItem }) {
  const pathname = usePathname();
  const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <div className="group flex cursor-not-allowed items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500">
        <Icon size={18} />
        <span className="flex-1">{item.label}</span>
        <Badge className="hidden px-2 py-0.5 text-[10px] xl:inline-flex" variant="warning">
          Em breve
        </Badge>
      </div>
    );
  }

  return (
    <Link
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        isActive
          ? "bg-indigo-400/10 text-indigo-100 ring-1 ring-indigo-300/20"
          : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
      )}
      href={item.href}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/dashboard";
  const isProjectsActive = pathname.startsWith("/dashboard/projects");

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-slate-950/90 px-4 py-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:flex lg:flex-col">
        <Link className="flex items-center gap-3 px-2" href="/dashboard">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg shadow-indigo-950/40">
            <Gauge className="text-white" size={22} />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white">Dashzada ROI</p>
            <p className="text-xs text-slate-500">Performance workspace</p>
          </div>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {sidebarItems.map((item) => (
            <SidebarLink item={item} key={item.label} />
          ))}
        </nav>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-4 flex items-center gap-3">
            <Blocks className="text-indigo-200" size={20} />
            <div>
              <p className="text-sm font-semibold text-white">Setup inicial</p>
              <p className="text-xs text-slate-500">Integrações futuras desativadas.</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-3 py-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1">
          <Link
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium",
              isDashboardActive ? "bg-indigo-400/10 text-indigo-100" : "text-slate-300",
            )}
            href="/dashboard"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium",
              isProjectsActive ? "bg-indigo-400/10 text-indigo-100" : "text-slate-300",
            )}
            href="/dashboard/projects"
          >
            <Building2 size={18} />
            Projetos
          </Link>
          <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-medium text-slate-500">
            <ChartNoAxesCombined size={18} />
            ROI
          </div>
          <LogoutButton compact />
        </div>
      </nav>
    </>
  );
}
