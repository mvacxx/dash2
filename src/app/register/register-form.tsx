"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RegisterError = {
  message: string;
};

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmação de senha precisa ser igual à senha.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as RegisterError | null;
        setError(data?.message ?? "Não foi possível criar sua conta. Tente novamente.");
        return;
      }

      router.push("/login?registered=1");
      router.refresh();
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="name">
          Nome
        </label>
        <Input
          required
          autoComplete="name"
          id="name"
          name="name"
          placeholder="Seu nome"
          type="text"
        />
      </div>

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
          autoComplete="new-password"
          id="password"
          minLength={6}
          name="password"
          placeholder="Mínimo 6 caracteres"
          type="password"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="confirmPassword">
          Confirmar senha
        </label>
        <Input
          required
          autoComplete="new-password"
          id="confirmPassword"
          minLength={6}
          name="confirmPassword"
          placeholder="Repita sua senha"
          type="password"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
