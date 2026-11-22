import type { BusinessInfo, BusinessProfile } from "@/types";
import { getLLM, renderPrompt, type LlmClient } from "../llm/llmClient";
import { profileAuditTemplate } from "../llm/templateGenerator";
import { profileAuditSchema, type ProfileAuditResult } from "./schemas";

const SYSTEM =
  "You are a local-business Google Business Profile auditor. Reply with one JSON object only.";

/** Profile-field problems and fixes. Template-generated unless an LLM key is set. */
export async function profileAudit(
  profile: BusinessProfile,
  intake: Partial<BusinessInfo>,
  llm: LlmClient | null = getLLM(),
): Promise<ProfileAuditResult> {
  if (!llm) return profileAuditTemplate(profile);
  const prompt = renderPrompt("profile-audit.md", {
    business: JSON.stringify({ profile, intake }),
  });
  return llm.completeJSON("profileAudit", SYSTEM, prompt, profileAuditSchema);
}
