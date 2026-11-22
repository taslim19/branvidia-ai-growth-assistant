import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Lifted cards get the single soft shadow (chat panel, modals). Default is a plain border. */
  lifted?: boolean;
}

export function Card({ children, lifted = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${
        lifted ? "shadow-[0_12px_32px_var(--shadow-color)]" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
