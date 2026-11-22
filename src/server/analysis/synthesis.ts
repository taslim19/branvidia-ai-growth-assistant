import type { BusinessInfo, BusinessProfile, ThemeCount } from "@/types";
import { getLLM, renderPrompt, type LlmClient } from "../llm/llmClient";
import { synthesisTemplate } from "../llm/templateGenerator";
import {
  synthesisSchema,
  type PhotoAnalysisResult,
  type ProfileAuditResult,
  type ReviewAnalysisResult,
  type SynthesisResult,
} from "./schemas";
import type { PhotoType } from "@/types";

const SYSTEM =
  "You turn a Google Business Profile audit into a prioritized action plan. Reply with one JSON object only.";

export interface SynthesisInput {
  profile: BusinessProfile;
  intake: Partial<BusinessInfo>;
  audit: ProfileAuditResult;
  reviewAnalysis: ReviewAnalysisResult;
  complaints: ThemeCount[];
  photoMissing: PhotoType[];
}

/** Problems, suggestions and next steps, merged from the earlier focused passes. */
export async function synthesis(
  input: SynthesisInput,
  llm: LlmClient | null = getLLM(),
): Promise<SynthesisResult> {
  if (!llm) {
    return synthesisTemplate({
      profile: input.profile,
      audit: input.audit,
      reviewAnalysis: input.reviewAnalysis,
      complaintThemes: input.complaints,
      photoMissing: input.photoMissing,
    });
  }
  const prompt = renderPrompt("synthesis.md", {
    businessName: input.profile.name,
    audit: JSON.stringify(input.audit),
    complaints: JSON.stringify(input.complaints),
    photoMissing: input.photoMissing.join(", ") || "none",
    goals: input.intake.goals ?? "not stated",
  });
  return llm.completeJSON("synthesis", SYSTEM, prompt, synthesisSchema);
}

export type { PhotoAnalysisResult };
