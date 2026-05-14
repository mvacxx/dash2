import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-950/40 hover:from-indigo-400 hover:to-blue-400",
  secondary:
    "border border-white/10 bg-white/[0.05] text-slate-100 hover:border-indigo-300/50 hover:bg-white/[0.08]",
  ghost: "text-slate-300 hover:bg-white/[0.06] hover:text-white",
  danger: "border border-red-300/20 bg-red-400/10 text-red-100 hover:bg-red-400/15",
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
