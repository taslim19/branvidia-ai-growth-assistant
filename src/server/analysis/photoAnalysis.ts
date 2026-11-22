import type { BusinessProfile, PhotoItem, PhotoType } from "@/types";
import { getLLM, renderPrompt, type LlmClient } from "../llm/llmClient";
import { photoAnalysisTemplate } from "../llm/templateGenerator";
import { photoAnalysisSchema } from "./schemas";

const SYSTEM =
  "You advise local businesses on Google Business Profile photos. Reply with one JSON object only.";

const ALL_PHOTO_TYPES: PhotoType[] = ["food", "drink", "interior", "exterior", "team", "menu"];

export interface PhotoInsightsResult {
  present: PhotoType[];
  missing: PhotoType[];
  contentIdeas: string[];
}

/** Missing types are computed in code; only the content ideas are worded by the LLM. */
export async function photoAnalysis(
  profile: BusinessProfile,
  photos: PhotoItem[],
  llm: LlmClient | null = getLLM(),
): Promise<PhotoInsightsResult> {
  const present = Array.from(new Set(photos.map((p) => p.type)));
  const missing = ALL_PHOTO_TYPES.filter((t) => !present.includes(t));
  const ideas = llm
    ? (
        await llm.completeJSON(
          "photoAnalysis",
          SYSTEM,
          renderPrompt("photo-analysis.md", {
            businessName: profile.name,
            category: profile.category,
            present: present.join(", ") || "none",
            missing: missing.join(", ") || "none",
          }),
          photoAnalysisSchema,
        )
      ).contentIdeas
    : photoAnalysisTemplate(photos).contentIdeas;
  return { present, missing, contentIdeas: ideas };
}
