import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { syncGamRevenue } from "@/services/gam-auto-sync";

export default async function HomeAliasPage() {
  const session = await auth();

  if (session?.user?.id) {
    await syncGamRevenue({ userId: session.user.id });
  }

  redirect("/");
}
