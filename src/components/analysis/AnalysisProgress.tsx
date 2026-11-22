"use client";

import { Check, Loader2 } from "lucide-react";

export function AnalysisProgress({
  steps,
  stepIndex,
  doneSteps,
}: {
  steps: string[];
  stepIndex: number;
  doneSteps: number;
}) {
  return (
    <div
      role="status"
      aria-label="Analysis in progress"
      className="rounded-card border border-line bg-surface p-5"
    >
      <h2 className="text-base font-semibold">Analysing your profile</h2>
      <ol className="mt-3 space-y-2.5">
        {steps.map((label, i) => {
          const done = i < doneSteps;
          const active = i === stepIndex && !done;
          return (
            <li key={label} className="flex items-center gap-2.5 text-base">
              {done ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-tint">
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                </span>
              ) : active ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mist">
                  <Loader2 className="spinner h-4 w-4 text-violet-fg" aria-hidden="true" />
                </span>
              ) : (
                <span className="h-6 w-6 rounded-full border border-line" aria-hidden="true" />
              )}
              <span className={done || active ? "text-ink" : "text-slate"}>{label}</span>
              {done ? <span className="sr-only">(done)</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
