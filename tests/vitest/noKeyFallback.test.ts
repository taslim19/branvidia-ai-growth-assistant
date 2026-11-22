import { describe, expect, it } from "vitest";
import { getLLM } from "@/server/llm/llmClient";
import { profileAuditTemplate, reviewAnalysisTemplate, reviewRepliesTemplate } from "@/server/llm/templateGenerator";
import { buildAndSaveReport } from "@/server/analysis/reportBuilder";
import { overallScore } from "@/server/analysis/scoreCalculator";
import { reportSchema } from "@/server/apiSchemas";
import { MOCK_BUSINESS_PROFILE, MOCK_PROFILES } from "@/mock/businessProfile";
import { MOCK_REVIEWS } from "@/mock/reviews";

describe("no-key deterministic fallback", () => {
  it("getLLM returns null without LLM_API_KEY", () => {
    expect(getLLM({ ...process.env, LLM_API_KEY: undefined })).toBeNull();
  });

  it("template profile audit flags the known gaps", () => {
    const audit = profileAuditTemplate(MOCK_BUSINESS_PROFILE);
    expect(audit.problems.some((p) => p.title.includes("hours"))).toBe(true);
    expect(audit.problems.some((p) => p.title.includes("website"))).toBe(true);
    expect(audit.suggestions.length).toBeGreaterThan(0);
  });

  it("template review analysis labels every review", () => {
    const result = reviewAnalysisTemplate(MOCK_BUSINESS_PROFILE, MOCK_REVIEWS);
    expect(result.reviewSentiments).toHaveLength(MOCK_REVIEWS.length);
    const negative = result.reviewSentiments.filter((s) => s.sentiment === "negative");
    expect(negative.length).toBe(MOCK_REVIEWS.filter((r) => r.rating <= 2).length);
  });

  it("template reply drafts: negative reviews first, no refund promises", () => {
    const analysis = reviewAnalysisTemplate(MOCK_BUSINESS_PROFILE, MOCK_REVIEWS);
    const { drafts } = reviewRepliesTemplate("Brew & Bean Café", MOCK_REVIEWS, analysis);
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.length).toBeLessThanOrEqual(3);
    expect(drafts[0].rating).toBeLessThanOrEqual(3);
    for (const d of drafts) {
      expect(d.draft.toLowerCase()).not.toMatch(/refund|discount|free|compensat/);
      expect(MOCK_REVIEWS.find((r) => r.id === d.reviewId)?.replied).toBe(false);
    }
  });

  it("buildAndSaveReport works end to end with no LLM key and no Mongo", async () => {
    const report = await buildAndSaveReport({
      locationId: "loc-indiranagar",
      intake: { name: "Brew & Bean Café", category: "Café" },
      tokens: null,
    });
    const parsed = reportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
    // The score equals the weighted sum of the breakdown - always.
    expect(report.score).toBe(overallScore(report.breakdown));
    // Aggregates cover the actual fetched review records; the profile's own
    // headline count stays in overview.profile.reviewCount.
    expect(report.reviewInsights.totalReviews).toBe(12);
    expect(report.overview.profile.reviewCount).toBe(MOCK_PROFILES["loc-indiranagar"].reviewCount);
    expect(report.reviewInsights.sentiment.positive +
      report.reviewInsights.sentiment.neutral +
      report.reviewInsights.sentiment.negative).toBe(12);
    expect(report.photoInsights.missing).toEqual(["interior", "exterior", "team", "menu"]);
    expect(report.replyDrafts.length).toBeGreaterThan(0);
  });

  it("the Koramangala location produces a different report", async () => {
    const report = await buildAndSaveReport({ locationId: "loc-koramangala", tokens: null });
    expect(report.overview.profile.locationId).toBe("loc-koramangala");
    expect(report.reviewInsights.totalReviews).toBe(5);
  });
});
