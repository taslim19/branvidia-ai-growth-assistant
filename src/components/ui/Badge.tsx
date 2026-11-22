import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "violet";

const tones: Record<BadgeTone, string> = {
  success: "bg-success-tint text-success-ink",
  warning: "bg-warning-tint text-warning-ink",
  danger: "bg-danger-tint text-danger-ink",
  neutral: "bg-mist text-slate",
  violet: "bg-mist text-violet-fg",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
