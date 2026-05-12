import Link from "next/link";
import { UserPlus } from "lucide-react";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 shadow-xl shadow-blue-950/40">
            <UserPlus className="text-blue-200" size={28} />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-blue-200">
            Dashzada ROI
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Crie sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Comece com uma conta segura para acessar o dashboard.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-blue-950/30 backdrop-blur md:p-8">
          <RegisterForm />

          <p className="mt-6 text-center text-sm text-slate-400">
            Já tem uma conta?{" "}
            <Link className="font-semibold text-blue-200 transition hover:text-blue-100" href="/login">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
