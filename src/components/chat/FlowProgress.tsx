import { FLOW_STEPS } from "@/types";

// Compact progress through the 10-step product flow.
export function FlowProgress({ step }: { step: number }) {
  const total = FLOW_STEPS.length;
  const current = Math.min(Math.max(step, 0), total - 1);
  const percent = Math.round(((current + 1) / total) * 100);

  return (
    <div aria-label={`Step ${current + 1} of ${total}: ${FLOW_STEPS[current]}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-slate">
          Step {current + 1} of {total}
        </p>
        <p className="truncate text-sm font-medium text-ink">{FLOW_STEPS[current]}</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Progress through the Branvidia flow"
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist"
      >
        <div
          className="h-full rounded-full bg-violet transition-[width] duration-base"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
