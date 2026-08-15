import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" | "accent" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
        variant === "default" && "bg-panel2 border border-border text-gray-200 hover:bg-white/5",
        variant === "ghost" && "text-muted hover:text-gray-200 hover:bg-white/5",
        variant === "accent" && "bg-accent text-white hover:bg-blue-500",
        className
      )}
      {...props}
    />
  );
}
