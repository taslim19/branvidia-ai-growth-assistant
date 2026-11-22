import type { ProfileFieldCheck } from "@/types";
import { ReportSection } from "./ReportSection";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const STATUS_META: Record<
  ProfileFieldCheck["status"],
  { label: string; tone: "success" | "warning" | "danger"; iconClass: string; Icon: typeof CheckCircle2 }
> = {
  ok: { label: "Ok", tone: "success", iconClass: "text-success", Icon: CheckCircle2 },
  warning: { label: "Needs work", tone: "warning", iconClass: "text-warning", Icon: AlertTriangle },
  missing: { label: "Missing", tone: "danger", iconClass: "text-danger", Icon: XCircle },
};

export function ProfileReviewSection({ checks }: { checks: ProfileFieldCheck[] }) {
  return (
    <ReportSection id="profile-review" title="Google Business Profile review">
      <ul className="space-y-3">
        {checks.map((check) => {
          const meta = STATUS_META[check.status];
          return (
            <li key={check.field} className="flex items-start gap-3">
              <meta.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.iconClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-medium text-ink">{check.field}</p>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <p className="mt-0.5 max-w-prose70 text-sm text-slate">{check.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </ReportSection>
  );
}
