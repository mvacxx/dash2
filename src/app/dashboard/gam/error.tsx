"use client";

import { AlertTriangle } from "lucide-react";

import { PageContainer } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";

type GamErrorProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function GamError({ error, reset }: GamErrorProps) {
  return (
    <PageContainer>
      <section className="rounded-3xl border border-red-300/20 bg-red-400/10 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 text-red-100">
          <AlertTriangle size={28} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-white">Não foi possível carregar GAM</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-red-100/80">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
        <Button className="mt-6" onClick={reset} variant="danger">
          Tentar novamente
        </Button>
      </section>
    </PageContainer>
  );
}
