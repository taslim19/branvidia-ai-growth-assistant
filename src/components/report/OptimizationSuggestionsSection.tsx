import type { Suggestion } from "@/types";
import { ReportSection } from "./ReportSection";
import { Badge } from "@/components/ui/Badge";

const IMPACT_TONE: Record<Suggestion["impact"], "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function OptimizationSuggestionsSection({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <ReportSection id="suggestions" title="AI optimization suggestions">
      <ul className="space-y-4">
        {suggestions.map((s) => (
          <li key={s.title} className="rounded-input border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{s.title}</h3>
              <Badge tone={IMPACT_TONE[s.impact]}>
                {s.impact === "high" ? "High impact" : s.impact === "medium" ? "Medium impact" : "Lower impact"}
              </Badge>
              <Badge tone="violet">{s.effort}</Badge>
            </div>
            <p className="mt-1.5 max-w-prose70 text-base text-slate">{s.detail}</p>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
