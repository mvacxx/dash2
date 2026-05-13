"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type DeleteProjectButtonProps = {
  projectId: string;
};

type DeleteProjectResponse = {
  message?: string;
};

export function DeleteProjectButton({ projectId }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm("Tem certeza que deseja excluir este projeto?");

    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as DeleteProjectResponse | null;

      if (!response.ok) {
        setError(data?.message ?? "Não foi possível excluir o projeto. Tente novamente.");
        return;
      }

      router.push("/dashboard/projects");
      router.refresh();
    });
  }

  return (
    <div>
      <Button disabled={isPending} onClick={handleDelete} variant="danger">
        <Trash2 size={18} />
        {isPending ? "Excluindo..." : "Excluir projeto"}
      </Button>
      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
