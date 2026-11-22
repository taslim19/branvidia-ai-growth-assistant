import { json } from "@/server/apiUtils";
import { getBusinessProfileProvider, isLiveProfileData, isMockMode } from "@/server/providers";
import { getReportStore } from "@/server/db/reportRepository";
import { getLLM } from "@/server/llm/llmClient";

export const dynamic = "force-dynamic";

/** Liveness + configuration truth, no secrets. */
export async function GET(): Promise<Response> {
  const store = await getReportStore();
  return json({
    status: "ok",
    // The data provider actually serving profile/reviews/photos; in the
    // hybrid default this is "mock" even though sign-in is real Google.
    provider: getBusinessProfileProvider().name,
    signIn: isMockMode() ? "simulated" : "google",
    profileData: !isMockMode() && isLiveProfileData() ? "live" : "mock",
    persistence: store.kind,
    platform: process.env.VERCEL ? "vercel" : "self-hosted",
    // On Vercel (serverless) in-memory stores are per-instance and lost on
    // cold start, so only a configured MongoDB counts as durable there.
    durable: store.kind !== "memory",
    llm: getLLM() ? "configured" : "template",
  });
}
