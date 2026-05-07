import { Bell, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type HeaderProps = {
  userName?: string | null;
  userEmail?: string | null;
};

export function Header({ userName, userEmail }: HeaderProps) {
  const displayName = userName ?? userEmail ?? "Usuário";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="flex min-h-20 items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-200" size={18} />
            <Badge variant="success">Base pronta</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-400">Ambiente seguro para construir a operação de dados.</p>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-6 md:flex">
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-500">
            <Search size={18} />
            <span>Buscar projetos, campanhas ou relatórios futuros...</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:text-white md:flex" type="button">
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 pr-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-bold text-white">
              {initials || "U"}
            </div>
            <div className="hidden sm:block">
              <p className="max-w-36 truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="max-w-36 truncate text-xs text-slate-500">{userEmail ?? "Sessão ativa"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
