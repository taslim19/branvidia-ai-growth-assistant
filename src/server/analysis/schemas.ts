import { z } from "zod";

/** Zod schemas for every structured LLM (and template) output in the pipeline. */

export const problemSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(["high", "medium", "low"]),
});

export const suggestionSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]),
  effort: z.enum(["quick win", "moderate", "bigger project"]),
});

export const nextStepSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  timeframe: z.string().min(1),
});

export const profileAuditSchema = z.object({
  problems: z.array(problemSchema).max(8),
  suggestions: z.array(suggestionSchema).max(8),
});
export type ProfileAuditResult = z.infer<typeof profileAuditSchema>;

export const reviewSentimentSchema = z.object({
  reviewId: z.string().min(1),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  themes: z.array(z.string().min(1)).max(3),
});
export const reviewAnalysisSchema = z.object({
  reviewSentiments: z.array(reviewSentimentSchema),
});
export type ReviewAnalysisResult = z.infer<typeof reviewAnalysisSchema>;
export type SentimentLabel = z.infer<typeof reviewSentimentSchema>["sentiment"];

export const photoAnalysisSchema = z.object({
  contentIdeas: z.array(z.string().min(1)).max(6),
});
export type PhotoAnalysisResult = z.infer<typeof photoAnalysisSchema>;

export const synthesisSchema = z.object({
  problems: z.array(problemSchema).max(8),
  suggestions: z.array(suggestionSchema).max(8),
  nextSteps: z.array(nextStepSchema).max(8),
});
export type SynthesisResult = z.infer<typeof synthesisSchema>;

export const reviewRepliesSchema = z.object({
  drafts: z
    .array(
      z.object({
        reviewId: z.string().min(1),
        author: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        reviewExcerpt: z.string().min(1),
        draft: z.string().min(1),
      }),
    )
    .max(5),
});
export type ReviewRepliesResult = z.infer<typeof reviewRepliesSchema>;
