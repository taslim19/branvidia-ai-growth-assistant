import type { BusinessProfile, ScoreBreakdown, SentimentSplit, ThemeCount } from "@/types";
import type { SentimentLabel } from "./schemas";

/**
 * Every number in the report is computed here, in code - never by the LLM.
 * The LLM (or template generator) labels and writes; this module counts,
 * scales and scores.
 */

export const SCORE_WEIGHTS = { profile: 35, reviews: 30, photos: 20, engagement: 15 } as const;

/** ok = 100, warning = 50, missing = 0, averaged over the field checks. */
export function profileScore(profile: BusinessProfile): number {
  const checks = profile.fieldChecks;
  if (checks.length === 0) return 50;
  const points = checks.reduce(
    (sum, c) => sum + (c.status === "ok" ? 100 : c.status === "warning" ? 50 : 0),
    0,
  );
  return Math.round(points / checks.length);
}

/** 60% positive-review share, 40% the average rating. */
export function reviewsScore(profile: BusinessProfile, sentiment: SentimentSplit): number {
  const total = Math.max(1, sentiment.positive + sentiment.neutral + sentiment.negative);
  const positiveShare = sentiment.positive / total;
  return Math.round(100 * (0.6 * positiveShare + 0.4 * (profile.rating / 5)));
}

const ALL_PHOTO_TYPES = 6;

export function photosScore(presentTypes: number): number {
  return Math.round((100 * presentTypes) / ALL_PHOTO_TYPES);
}

/** Engagement is how reliably the business replies to reviews. */
export function engagementScore(replyRatePercent: number): number {
  return replyRatePercent;
}

/** Weighted overall, rounded exactly once at the end. */
export function overallScore(breakdown: ScoreBreakdown): number {
  const weighted =
    (SCORE_WEIGHTS.profile * breakdown.profile +
      SCORE_WEIGHTS.reviews * breakdown.reviews +
      SCORE_WEIGHTS.photos * breakdown.photos +
      SCORE_WEIGHTS.engagement * breakdown.engagement) /
    (SCORE_WEIGHTS.profile + SCORE_WEIGHTS.reviews + SCORE_WEIGHTS.photos + SCORE_WEIGHTS.engagement);
  return Math.round(weighted);
}

/** Sentiment counts over the actual review records analyzed. Never extrapolated. */
export function sentimentSplit(labels: SentimentLabel[]): SentimentSplit {
  return {
    positive: labels.filter((l) => l === "positive").length,
    neutral: labels.filter((l) => l === "neutral").length,
    negative: labels.filter((l) => l === "negative").length,
  };
}

/** Replied count and reply rate over the actual review records analyzed. */
export function replyStats(
  repliedCount: number,
  recordCount: number,
): { repliedCount: number; replyRatePercent: number } {
  const replyRatePercent = recordCount > 0 ? Math.round((100 * repliedCount) / recordCount) : 0;
  return { repliedCount, replyRatePercent };
}

/** Top themes within one sentiment class, by review count. */
export function themeCounts(
  entries: { sentiment: SentimentLabel; themes: string[] }[],
  want: SentimentLabel,
  limit = 3,
): ThemeCount[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.sentiment !== want) continue;
    for (const theme of entry.themes) counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}
