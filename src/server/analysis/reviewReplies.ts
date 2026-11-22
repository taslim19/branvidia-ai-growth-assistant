import type { BusinessProfile, Review } from "@/types";
import { getLLM, renderPrompt, type LlmClient } from "../llm/llmClient";
import { reviewRepliesTemplate } from "../llm/templateGenerator";
import {
  reviewRepliesSchema,
  type ReviewAnalysisResult,
  type ReviewRepliesResult,
} from "./schemas";

const SYSTEM =
  "You draft Google review replies for a local business owner. Tone-matched to each review, " +
  "careful and specific with negative reviews, never defensive. Never promise refunds, " +
  "discounts or compensation. Reply with one JSON object only.";

/** Reply drafts for the unanswered reviews, negative ones first. */
export async function reviewReplies(
  profile: BusinessProfile,
  reviews: Review[],
  analysis: ReviewAnalysisResult,
  llm: LlmClient | null = getLLM(),
): Promise<ReviewRepliesResult> {
  if (!llm) return reviewRepliesTemplate(profile.name, reviews, analysis);
  const unanswered = reviews.filter((r) => !r.replied);
  const prompt = renderPrompt("review-replies.md", {
    businessName: profile.name,
    reviews: JSON.stringify(
      unanswered.map((r) => ({ id: r.id, author: r.author, rating: r.rating, text: r.text })),
    ),
  });
  return llm.completeJSON("reviewReplies", SYSTEM, prompt, reviewRepliesSchema);
}
