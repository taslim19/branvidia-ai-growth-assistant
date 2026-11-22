import type { Report } from "@/types";
import { ReportSection } from "./ReportSection";
import { formatPercent } from "@/lib/formatters";

export function ReviewInsightsSection({ insights }: { insights: Report["reviewInsights"] }) {
  const { sentiment, totalReviews, positiveThemes, complaints, replyRatePercent, repliedCount } =
    insights;
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;

  return (
    <ReportSection id="review-insights" title="Customer review insights">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold">Sentiment across {totalReviews} reviews</h3>
          <div
            role="img"
            aria-label={`Sentiment: ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative out of ${totalReviews} reviews`}
            className="mt-2 flex h-4 overflow-hidden rounded-full"
          >
            <div className="bg-success" style={{ width: `${(sentiment.positive / total) * 100}%` }} />
            <div className="bg-line" style={{ width: `${(sentiment.neutral / total) * 100}%` }} />
            <div className="bg-danger" style={{ width: `${(sentiment.negative / total) * 100}%` }} />
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate">
            <li>
              <span className="font-medium text-success">{sentiment.positive} positive</span>
            </li>
            <li>
              <span className="font-medium text-slate">{sentiment.neutral} neutral</span>
            </li>
            <li>
              <span className="font-medium text-danger">{sentiment.negative} negative</span>
            </li>
          </ul>
          <p className="mt-4 text-base text-ink">
            Reply rate: <span className="font-semibold">{formatPercent(replyRatePercent)}</span>{" "}
            <span className="text-slate">({repliedCount} of {totalReviews} reviews answered)</span>
          </p>
        </div>
        <div className="space-y-4">
          <ThemeList title="What customers praise" themes={positiveThemes} />
          <ThemeList title="What customers complain about" themes={complaints} />
        </div>
      </div>
    </ReportSection>
  );
}

function ThemeList({
  title,
  themes,
}: {
  title: string;
  themes: { label: string; count: number }[];
}) {
  const max = Math.max(...themes.map((t) => t.count), 1);
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <ul className="mt-2 space-y-2">
        {themes.map((t) => (
          <li key={t.label}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <p className="min-w-0 break-words text-ink">{t.label}</p>
              <p className="tabular shrink-0 font-medium text-slate">{t.count} reviews</p>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
              <div className="h-full rounded-full bg-violet" style={{ width: `${(t.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
