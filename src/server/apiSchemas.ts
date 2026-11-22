import { z } from "zod";

/**
 * Request/response validation for the API routes. Shapes mirror
 * src/types/index.ts and src/lib/chatFlow.ts exactly; those files stay the
 * source of truth for the types themselves.
 */

export const MAX_INPUT_LENGTH = 1000;
export const MAX_FIELD_LENGTH = 300;

const businessInfoPartial = z.object({
  name: z.string().max(MAX_FIELD_LENGTH).optional(),
  category: z.string().max(MAX_FIELD_LENGTH).optional(),
  productsServices: z.string().max(MAX_FIELD_LENGTH).optional(),
  targetCustomers: z.string().max(MAX_FIELD_LENGTH).optional(),
  goals: z.string().max(MAX_FIELD_LENGTH).optional(),
});

export const chatPhaseSchema = z.enum([
  "asking",
  "summary",
  "optin",
  "tips",
  "awaiting-choice",
  "analysis",
  "done",
]);

export const chatSessionStateSchema = z.object({
  questionIndex: z.number().int().min(-1).max(4),
  phase: chatPhaseSchema,
  info: businessInfoPartial,
});

export const chatMessageBodySchema = z.object({
  state: chatSessionStateSchema,
  input: z.string().min(1).max(MAX_INPUT_LENGTH),
});

export const skipOptInBodySchema = z.object({
  state: chatSessionStateSchema,
});

export const analysisBodySchema = z.object({
  intake: businessInfoPartial.optional(),
});

export const locationIdSchema = z.string().min(1).max(200);

// --- Response schemas (contract tests validate route output against these) ---

export const chatReplyMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  kind: z.enum(["text", "summary", "optin", "tips", "analysis", "notice"]),
  text: z.string(),
  summaryRows: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  tips: z.array(z.string()).optional(),
  quickReplies: z.array(z.string()).optional(),
});

export const chatTurnResultSchema = z.object({
  replies: z.array(chatReplyMessageSchema),
  state: chatSessionStateSchema,
  step: z.number().int().min(0).max(9),
});

export const reportSchema = z.object({
  source: z.enum(["llm", "template"]),
  id: z.string().min(1),
  businessName: z.string().min(1),
  createdAt: z.string().min(1),
  score: z.number().int().min(0).max(100),
  breakdown: z.object({
    profile: z.number(),
    reviews: z.number(),
    photos: z.number(),
    engagement: z.number(),
  }),
  overview: z.object({}).passthrough(),
  reviewInsights: z.object({
    sentiment: z.object({ positive: z.number(), neutral: z.number(), negative: z.number() }),
    totalReviews: z.number(),
    positiveThemes: z.array(z.object({ label: z.string(), count: z.number() })),
    complaints: z.array(z.object({ label: z.string(), count: z.number() })),
    replyRatePercent: z.number(),
    repliedCount: z.number(),
    unansweredReviews: z.array(z.object({}).passthrough()),
  }),
  photoInsights: z.object({
    present: z.array(z.string()),
    missing: z.array(z.string()),
    contentIdeas: z.array(z.string()),
  }),
  photos: z.array(z.object({}).passthrough()),
  problems: z.array(z.object({}).passthrough()),
  suggestions: z.array(z.object({}).passthrough()),
  replyDrafts: z.array(z.object({}).passthrough()),
  nextSteps: z.array(z.object({}).passthrough()),
});

export const savedReportSummarySchema = z.object({
  id: z.string().min(1),
  businessName: z.string(),
  score: z.number(),
  createdAt: z.string(),
});
