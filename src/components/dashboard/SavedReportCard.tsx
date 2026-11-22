import Link from "next/link";
import type { SavedReportSummary } from "@/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { scoreLabel, scoreTone } from "@/lib/scoreLabels";
import { formatDateTime } from "@/lib/formatters";

export function SavedReportCard({ report }: { report: SavedReportSummary }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold" translate="no">{report.businessName}</h3>
          <p className="mt-0.5 text-sm text-slate">{formatDateTime(report.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={scoreTone(report.score)}>
            <span className="tabular">{report.score}</span>
            <span aria-hidden="true" className="h-3 w-px bg-current opacity-40" />
            <span>{scoreLabel(report.score)}</span>
          </Badge>
          <Link
            href={`/report/${report.id}`}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-fast hover:bg-mist"
          >
            View report
          </Link>
        </div>
      </div>
    </Card>
  );
}
