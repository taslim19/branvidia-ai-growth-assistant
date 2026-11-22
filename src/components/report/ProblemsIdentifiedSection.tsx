import type { Problem } from "@/types";
import { ReportSection } from "./ReportSection";
import { Badge } from "@/components/ui/Badge";

const SEVERITY_TONE: Record<Problem["severity"], "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function ProblemsIdentifiedSection({ problems }: { problems: Problem[] }) {
  return (
    <ReportSection id="problems" title="Problems identified">
      <ul className="space-y-4">
        {problems.map((p) => (
          <li key={p.title}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{p.title}</h3>
              <Badge tone={SEVERITY_TONE[p.severity]}>
                {p.severity === "high" ? "High impact" : p.severity === "medium" ? "Medium impact" : "Low impact"}
              </Badge>
            </div>
            <p className="mt-1 max-w-prose70 text-base text-slate">{p.detail}</p>
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
