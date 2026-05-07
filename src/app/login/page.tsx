import Link from "next/link";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-300/20 bg-indigo-400/10 shadow-xl shadow-indigo-950/40">
            <BarChart3 className="text-indigo-200" size={28} />
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-200">
            Dashzada ROI
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Entre na sua conta
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Acesse o dashboard protegido da sua operação.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-indigo-950/30 backdrop-blur md:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-sm text-slate-400">
            Ainda não tem uma conta?{" "}
            <Link className="font-semibold text-indigo-200 transition hover:text-indigo-100" href="/register">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
