import type { NextStep } from "@/types";
import { ReportSection } from "./ReportSection";
import { Badge } from "@/components/ui/Badge";

export function NextStepsSection({ steps }: { steps: NextStep[] }) {
  return (
    <ReportSection id="next-steps" title="Suggested next steps">
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist font-heading text-sm font-semibold text-violet-fg"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{step.title}</h3>
                <Badge tone="violet">{step.timeframe}</Badge>
              </div>
              <p className="mt-0.5 max-w-prose70 text-base text-slate">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </ReportSection>
  );
}
