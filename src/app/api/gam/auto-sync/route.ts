import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { syncGamRevenue } from "@/services/gam-auto-sync";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const result = await syncGamRevenue({ force: true, userId });

  return NextResponse.json({ result });
}
