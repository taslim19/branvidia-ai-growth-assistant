import { describe, expect, it } from "vitest";
import {
  SCORE_WEIGHTS,
  overallScore,
  photosScore,
  profileScore,
  replyStats,
  reviewsScore,
  sentimentSplit,
  themeCounts,
} from "@/server/analysis/scoreCalculator";
import { MOCK_BUSINESS_PROFILE } from "@/mock/businessProfile";

describe("scoreCalculator", () => {
  it("overall score equals the weighted sum (35/30/20/15), rounded once", () => {
    const breakdown = { profile: 44, reviews: 74, photos: 33, engagement: 43 };
    const expected = Math.round(
      (35 * 44 + 30 * 74 + 20 * 33 + 15 * 43) / 100,
    );
    expect(overallScore(breakdown)).toBe(expected);
    expect(SCORE_WEIGHTS.profile + SCORE_WEIGHTS.reviews + SCORE_WEIGHTS.photos + SCORE_WEIGHTS.engagement).toBe(100);
  });

  it("profile score averages field checks (ok=100, warning=50, missing=0)", () => {
    // Mock profile: 3 ok, 2 warning, 4 missing -> (300 + 100) / 9 = 44.44 -> 44
    expect(profileScore(MOCK_BUSINESS_PROFILE)).toBe(44);
  });

  it("reviews score blends positive share and rating", () => {
    const sentiment = { positive: 7, neutral: 2, negative: 3 };
    // positiveShare 7/12 = 0.5833 -> 0.35; rating 4.2/5 = 0.84 -> 0.336 => 68.6 -> 69
    expect(reviewsScore(MOCK_BUSINESS_PROFILE, sentiment)).toBe(69);
  });

  it("photos score is type coverage over 6", () => {
    expect(photosScore(2)).toBe(33);
    expect(photosScore(6)).toBe(100);
  });

  it("sentimentSplit counts the actual labels, never extrapolates", () => {
    const labels = [
      "positive", "positive", "positive", "positive", "positive", "positive", "positive",
      "neutral", "neutral", "negative", "negative", "negative",
    ] as const;
    expect(sentimentSplit([...labels])).toEqual({ positive: 7, neutral: 2, negative: 3 });
  });

  it("replyStats counts actual records and computes the rate from them", () => {
    const { repliedCount, replyRatePercent } = replyStats(5, 12);
    expect(repliedCount).toBe(5);
    expect(replyRatePercent).toBe(42);
    expect(replyStats(0, 0).replyRatePercent).toBe(0);
  });

  it("themeCounts counts only the wanted sentiment, sorted by count", () => {
    const entries = [
      { sentiment: "positive" as const, themes: ["Coffee quality", "Ambience"] },
      { sentiment: "positive" as const, themes: ["Coffee quality"] },
      { sentiment: "negative" as const, themes: ["Slow service"] },
    ];
    expect(themeCounts(entries, "positive")).toEqual([
      { label: "Coffee quality", count: 2 },
      { label: "Ambience", count: 1 },
    ]);
    expect(themeCounts(entries, "negative")).toEqual([{ label: "Slow service", count: 1 }]);
  });
});
