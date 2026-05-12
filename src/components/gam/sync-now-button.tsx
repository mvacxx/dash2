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

type SyncNowButtonProps = {
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
};

export function SyncNowButton({
  dateFrom,
  dateTo,
  projectId,
}: SyncNowButtonProps = {}) {
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "success" | "loading";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    setToast({ message: "Sincronizando...", type: "loading" });

    startTransition(async () => {
      const response = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(projectId ? { projectId } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
        }),
      });
      const data = (await response
        .json()
        .catch(() => null)) as SyncTriggerResponse | null;

      if (!response.ok || !data?.ok) {
        setToast({
          message: data?.message ?? "Não foi possível sincronizar agora.",
          type: "error",
        });
        return;
      }

      setToast({
        message:
          data.rows === 0
            ? "Nenhuma receita encontrada para o período."
            : `Sincronização concluída: ${data.rows ?? 0} registros encontrados`,
        type: "success",
      });
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
      {toast ? (
        <div
          className={`rounded-2xl border px-3 py-2 text-xs shadow-xl ${
            toast.type === "error"
              ? "border-rose-300/30 bg-rose-500/10 text-rose-100"
              : toast.type === "success"
                ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                : "border-indigo-300/30 bg-indigo-500/10 text-indigo-100"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
