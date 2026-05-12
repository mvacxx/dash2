"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type SyncTriggerResponse = {
  ok?: boolean;
  accounts?: number;
  rows?: number;
  syncSince?: string;
  syncUntil?: string;
  message?: string;
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
        .catch(() => null)) as SyncTriggerResponse | null;

      if (!response.ok || !data?.ok) {
        setMessage(data?.message ?? "Não foi possível sincronizar agora.");
        return;
      }

      setMessage(
        data.rows === 0
          ? "Nenhuma receita encontrada para o período."
          : (data.message ??
              `Sincronização concluída: ${data.rows} linha(s), ${data.accounts ?? 0} conexão(ões).`),
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
