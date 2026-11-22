import type { BusinessInfo, Report } from "@/types";
import { getBusinessProfileProvider } from "../providers";
import type { BusinessProfileProvider, TokenSet } from "../providers/types";
import { getLLM, LlmError, type LlmClient } from "../llm/llmClient";
import { getReportStore } from "../db/reportRepository";
import { profileAudit } from "./profileAudit";
import { reviewAnalysis } from "./reviewAnalysis";
import { photoAnalysis } from "./photoAnalysis";
import { synthesis } from "./synthesis";
import { reviewReplies } from "./reviewReplies";
import {
  engagementScore,
  overallScore,
  photosScore,
  profileScore,
  replyStats,
  reviewsScore,
  sentimentSplit,
  themeCounts,
} from "./scoreCalculator";

/**
 * Orchestrates the AI pipeline and assembles the Report. Focused passes run
 * with Promise.all; every number is computed in code by scoreCalculator.
 * LLM failures rebuild the entire report with templates and label its source.
 * Data-provider failures still propagate rather than fabricating input data.
 */

/**
 * Reviews and photos come from the selected provider in every mode: the mock
 * provider serves its fixtures, the Google provider maps the real GMB
 * reviews/media responses record by record. A failed fetch propagates - the
 * route returns a clear error, never a partial or fabricated report.
 */
async function reviewPhotoSource(
  provider: BusinessProfileProvider,
  locationId: string,
  tokens: TokenSet | null,
) {
  const [reviews, photos] = await Promise.all([
    provider.getRecentReviews(locationId, tokens),
    provider.getRecentPhotos(locationId, tokens),
  ]);
  return { reviews, unanswered: reviews.filter((r) => !r.replied), photos };
}

export async function buildAndSaveReport(input: {
  locationId: string;
  intake?: Partial<BusinessInfo>;
  tokens: TokenSet | null;
}): Promise<Report> {
  const provider = getBusinessProfileProvider();
  const [profile, source] = await Promise.all([
    provider.getProfile(input.locationId, input.tokens),
    reviewPhotoSource(provider, input.locationId, input.tokens),
  ]);
  const { reviews, unanswered, photos } = source;
  const intake = input.intake ?? {};
  const llm = getLLM();

  async function runPipeline(client: LlmClient | null) {
    // Await all peers before falling back so no abandoned LLM calls linger.
    async function all<T extends readonly unknown[]>(tasks: { [K in keyof T]: Promise<T[K]> }): Promise<T> {
      const results = await Promise.allSettled(tasks);
      const failure = results.find((r) => r.status === "rejected");
      if (failure?.status === "rejected") throw failure.reason;
      return results.map((r) => (r as PromiseFulfilledResult<unknown>).value) as unknown as T;
    }
    const [audit, reviewRes, photoInsights] = await all([
      profileAudit(profile, intake, client),
      reviewAnalysis(profile, reviews, client),
      photoAnalysis(profile, photos, client),
    ] as const);
    const sentiments = reviewRes.reviewSentiments;
    const complaints = themeCounts(sentiments, "negative");
    const positiveThemes = themeCounts(sentiments, "positive");
    const [synth, replies] = await all([
      synthesis({ profile, intake, audit, reviewAnalysis: reviewRes, complaints,
        photoMissing: photoInsights.missing }, client),
      reviewReplies(profile, reviews, reviewRes, client),
    ] as const);
    return { sentiments, complaints, positiveThemes, photoInsights, synth, replies };
  }
  let reportSource: Report["source"] = llm ? "llm" : "template";
  let result;
  try {
    result = await runPipeline(llm);
  } catch (err) {
    if (!(err instanceof LlmError)) throw err;
    // Sanitized category only - never prompts, content or credentials.
    console.error(
      `[branvidia] LLM pipeline failed; using template report.` +
      ` stage=${err.task ?? "unknown"} category=${err.category}` +
      (err.httpStatus ? ` httpStatus=${err.httpStatus}` : ""),
    );
    // Rebuild every generated field from templates, never label mixed output.
    reportSource = "template";
    result = await runPipeline(null);
  }
  const { sentiments, complaints, positiveThemes, photoInsights, synth, replies } = result;

  // All numbers from code, computed only over the actual review records
  // fetched - never extrapolated to the profile's headline review count
  // (that stays visible as overview.profile.reviewCount).
  const sentiment = sentimentSplit(sentiments.map((s) => s.sentiment));
  const { repliedCount, replyRatePercent } = replyStats(
    reviews.filter((r) => r.replied).length,
    reviews.length,
  );
  const breakdown = {
    profile: profileScore(profile),
    reviews: reviewsScore(profile, sentiment),
    photos: photosScore(photoInsights.present.length),
    engagement: engagementScore(replyRatePercent),
  };

  const report: Report = {
    source: reportSource,
    id: `rpt-${input.locationId}-${Date.now()}`,
    businessName: intake.name?.trim() || profile.name,
    createdAt: new Date().toISOString(),
    score: overallScore(breakdown),
    breakdown,
    overview: {
      business: {
        name: intake.name?.trim() || profile.name,
        category: intake.category?.trim() || profile.category,
        productsServices: intake.productsServices?.trim() || profile.category,
        targetCustomers: intake.targetCustomers?.trim() || "Local customers",
        goals: intake.goals?.trim() || "Grow the business",
      },
      profile,
    },
    reviewInsights: {
      sentiment,
      totalReviews: reviews.length,
      positiveThemes,
      complaints,
      replyRatePercent,
      repliedCount,
      unansweredReviews: unanswered,
    },
    photoInsights,
    photos,
    problems: synth.problems,
    suggestions: synth.suggestions,
    replyDrafts: replies.drafts,
    nextSteps: synth.nextSteps,
  };

  const store = await getReportStore();
  await store.save(report);
  return report;
}
