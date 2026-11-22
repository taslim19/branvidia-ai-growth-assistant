import type { BusinessProfile, Review } from "@/types";
import { getLLM, renderPrompt, type LlmClient } from "../llm/llmClient";
import { reviewAnalysisTemplate } from "../llm/templateGenerator";
import { reviewAnalysisSchema, type ReviewAnalysisResult } from "./schemas";

const SYSTEM =
  "You analyze Google reviews for a local business. Label sentiment and themes per review. Reply with one JSON object only.";

/** Per-review sentiment and themes. Counting happens in scoreCalculator, not here. */
export async function reviewAnalysis(
  profile: BusinessProfile,
  reviews: Review[],
  llm: LlmClient | null = getLLM(),
): Promise<ReviewAnalysisResult> {
  if (!llm) return reviewAnalysisTemplate(profile, reviews);
  const prompt = renderPrompt("review-analysis.md", {
    businessName: profile.name,
    reviews: JSON.stringify(reviews.map((r) => ({ id: r.id, rating: r.rating, text: r.text }))),
  });
  return llm.completeJSON("reviewAnalysis", SYSTEM, prompt, reviewAnalysisSchema);
}
