import type { ScoreBreakdown as ScoreBreakdownType } from "@/types";
import { scoreLabel } from "@/lib/scoreLabels";

const ROWS: { key: keyof ScoreBreakdownType; label: string; weight: string }[] = [
  { key: "profile", label: "Profile", weight: "35%" },
  { key: "reviews", label: "Reviews", weight: "30%" },
  { key: "photos", label: "Photos", weight: "20%" },
  { key: "engagement", label: "Engagement", weight: "15%" },
];

export function ScoreBreakdown({ breakdown }: { breakdown: ScoreBreakdownType }) {
  return (
    <ul className="space-y-3">
      {ROWS.map((row) => {
        const value = breakdown[row.key];
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <p className="font-medium text-ink">
                {row.label} <span className="text-slate">({row.weight} of score)</span>
              </p>
              <p className="shrink-0 text-sm text-ink">
                <span className="tabular font-semibold">{value}</span>{" "}
                <span className="text-slate">{scoreLabel(value)}</span>
              </p>
            </div>
            <div
              role="img"
              aria-label={`${row.label} scores ${value} out of 100`}
              className="mt-1 h-2 overflow-hidden rounded-full bg-mist"
            >
              <div className="h-full rounded-full bg-violet" style={{ width: `${value}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
