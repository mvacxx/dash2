"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  compact?: boolean;
};

export function LogoutButton({ compact = false }: LogoutButtonProps) {
  return (
    <Button
      className={compact ? "w-11 px-0" : "w-full"}
      onClick={() => signOut({ callbackUrl: "/login" })}
      variant="ghost"
    >
      <LogOut size={18} />
      {compact ? <span className="sr-only">Sair</span> : <span>Sair</span>}
    </Button>
  );
}
