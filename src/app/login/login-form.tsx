"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const registered = searchParams.get("registered") === "1";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const safeCallbackUrl = callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha inválidos. Confira os dados e tente novamente.");
        return;
      }

      router.push(safeCallbackUrl);
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
          E-mail
        </label>
        <Input
          required
          autoComplete="email"
          id="email"
          name="email"
          placeholder="voce@empresa.com"
          type="email"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
          Senha
        </label>
        <Input
          required
          autoComplete="current-password"
          id="password"
          name="password"
          placeholder="Sua senha"
          type="password"
        />
      </div>

      {registered ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Conta criada com sucesso. Faça login para continuar.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
