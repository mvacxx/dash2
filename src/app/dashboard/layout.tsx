import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { auth } from "@/lib/auth";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 lg:pb-0">
      <Sidebar />
      <div className="min-h-screen lg:pl-72">
        <Header userEmail={session.user.email} userName={session.user.name} />
        {children}
      </div>
    </div>
  );
}
