"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type AutoSyncResponse = {
  message?: string;
  result?: {
    rows: number;
    skipped: number;
    synced: number;
    warning?: string;
  };
};

export function SyncNowButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    setMessage("Sincronizando...");

    startTransition(async () => {
      const response = await fetch("/api/sync/trigger", {
        method: "POST",
      });
      const data = (await response
        .json()
        .catch(() => null)) as AutoSyncResponse | null;

      if (!response.ok) {
        setMessage(data?.message ?? "Não foi possível sincronizar agora.");
        return;
      }

      const rows = data?.result?.rows ?? 0;
      const synced = data?.result?.synced ?? 0;
      const warning = data?.result?.warning;

      setMessage(
        warning ??
          `Sincronização concluída: ${rows} linha(s), ${synced} conexão(ões).`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={isPending} onClick={handleSync} type="button">
        <RefreshCw
          className={isPending ? "animate-spin" : undefined}
          size={18}
        />
        {isPending ? "Sincronizando..." : "Sincronizar agora"}
      </Button>
      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
