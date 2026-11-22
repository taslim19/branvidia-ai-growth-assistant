// Shared types for the Branvidia AI Growth Assistant frontend.
// The mock layer and the future FastAPI backend both speak these shapes.

export type ChatRole = "assistant" | "user";

export type ChatMessageKind =
  | "text"
  | "summary"
  | "optin"
  | "tips"
  | "analysis"
  | "notice";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  kind: ChatMessageKind;
  text: string;
  /** Extra payload for rich cards (summary rows, tips). */
  summaryRows?: { label: string; value: string }[];
  tips?: string[];
  quickReplies?: string[];
  createdAt: string;
}

/** The 10 steps of the full product flow, in order. */
export const FLOW_STEPS = [
  "Website",
  "AI chatbot",
  "Understand business",
  "Customer opt-in",
  "Connect Google account",
  "Google Business Profile",
  "AI analysis",
  "Reviews and photos analysis",
  "Optimization suggestions",
  "Final AI report",
] as const;

export type FlowStepIndex = number; // 0-based index into FLOW_STEPS

export interface BusinessInfo {
  name: string;
  category: string;
  productsServices: string;
  targetCustomers: string;
  goals: string;
}

export interface GoogleAccount {
  id: string;
  name: string;
  email: string;
}

export interface BusinessLocation {
  id: string;
  name: string;
  area: string;
  city: string;
}

export type ProfileFieldStatus = "ok" | "warning" | "missing";

export interface ProfileFieldCheck {
  field: string;
  status: ProfileFieldStatus;
  note: string;
}

export interface DayHours {
  day: string;
  open: string | null; // null means not set
  close: string | null;
}

export interface BusinessProfile {
  locationId: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  description: string;
  phone: string;
  address: string;
  hours: DayHours[];
  websiteUrl: string | null;
  menuUrl: string | null;
  attributes: { label: string; set: boolean }[];
  fieldChecks: ProfileFieldCheck[];
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1-5
  date: string; // ISO date
  text: string;
  replied: boolean;
  replyText?: string;
}

export type PhotoType = "food" | "drink" | "interior" | "exterior" | "team" | "menu";

export interface PhotoItem {
  id: string;
  src: string;
  alt: string;
  type: PhotoType;
}

export interface SentimentSplit {
  positive: number;
  neutral: number;
  negative: number;
}

export interface ThemeCount {
  label: string;
  count: number;
}

export interface PhotoInsights {
  present: PhotoType[];
  missing: PhotoType[];
  contentIdeas: string[];
}

export type Severity = "high" | "medium" | "low";

export interface Problem {
  title: string;
  detail: string;
  severity: Severity;
}

export type Impact = "high" | "medium" | "low";
export type Effort = "quick win" | "moderate" | "bigger project";

export interface Suggestion {
  title: string;
  detail: string;
  impact: Impact;
  effort: Effort;
}

export interface ReviewReplyDraft {
  reviewId: string;
  author: string;
  rating: number;
  reviewExcerpt: string;
  draft: string;
}

export interface NextStep {
  title: string;
  detail: string;
  timeframe: string;
}

export interface ScoreBreakdown {
  profile: number;
  reviews: number;
  photos: number;
  engagement: number;
}

export interface Report {
  source: "llm" | "template";
  /**
   * Where the business profile/reviews/photos behind this report came from:
   * "google" only when the real Business Profile APIs were called, otherwise
   * "mock" (bundled sample data). Optional for reports saved before the
   * hybrid mode existed; treat a missing value as "mock".
   */
  dataSource?: "mock" | "google";
  id: string;
  businessName: string;
  createdAt: string; // ISO
  score: number;
  breakdown: ScoreBreakdown;
  overview: {
    business: BusinessInfo;
    profile: BusinessProfile;
  };
  reviewInsights: {
    sentiment: SentimentSplit;
    totalReviews: number;
    positiveThemes: ThemeCount[];
    complaints: ThemeCount[];
    replyRatePercent: number;
    repliedCount: number;
    unansweredReviews: Review[];
  };
  photoInsights: PhotoInsights;
  photos: PhotoItem[];
  problems: Problem[];
  suggestions: Suggestion[];
  replyDrafts: ReviewReplyDraft[];
  nextSteps: NextStep[];
}

export interface SavedReportSummary {
  id: string;
  businessName: string;
  score: number;
  createdAt: string;
}

export interface ChatReply {
  messages: Omit<ChatMessage, "id" | "createdAt">[];
  /** Step of the 10-step flow the conversation is at after this reply. */
  step: FlowStepIndex;
  /** True when the opt-in card should be shown. */
  showOptIn?: boolean;
}
