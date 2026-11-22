"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-medium transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-violet text-violet-on hover:bg-violet-strong",
  secondary: "border border-line bg-surface text-ink hover:bg-mist",
  ghost: "text-violet-fg hover:bg-mist",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, disabled, children, className = "", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="spinner h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
