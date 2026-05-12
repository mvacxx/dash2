import Link from "next/link";

import { ArrowRight, BarChart3, LockKeyhole, Users } from "lucide-react";

const highlights = [
  {
    icon: Users,
    title: "Multiusuário",
    description:
      "Base preparada para autenticação e acesso protegido por usuário.",
  },
  {
    icon: BarChart3,
    title: "Pronto para dashboards",
    description:
      "Estrutura inicial organizada para evoluir relatórios no momento certo.",
  },
  {
    icon: LockKeyhole,
    title: "Acesso protegido",
    description: "Dashboard privado usando Auth.js/NextAuth e middleware.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
      <nav className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">
          Dashzada ROI
        </span>
        <Link
          href="/dashboard"
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-teal-300/70 hover:text-white"
        >
          Entrar no dashboard
        </Link>
      </nav>

      <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-sm font-medium text-teal-200">
            SaaS base em Next.js 15
          </p>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white md:text-7xl">
            Base limpa para o futuro dashboard de ROI.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            O Dashzada ROI nasce como uma fundação segura, tipada e organizada
            para evoluir a comparação entre gastos de mídia e receitas em etapas
            futuras.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
            >
              Acessar área protegida
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-teal-950/30 backdrop-blur">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Status do projeto</p>
                <h2 className="text-2xl font-semibold text-white">
                  Fundação pronta
                </h2>
              </div>
              <div className="h-3 w-3 rounded-full bg-teal-300 shadow-lg shadow-teal-300/50" />
            </div>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl bg-white/[0.03] p-4"
                >
                  <item.icon className="mt-1 text-teal-200" size={22} />
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
