"use client";

import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line bg-surface p-8">
      {icon ? <div className="text-slate">{icon}</div> : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-prose70 text-base text-slate">{message}</p>
      {action}
    </div>
  );
}
