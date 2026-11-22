import { json } from "@/server/apiUtils";
import { isMockMode } from "@/server/providers";
import { getReportStore } from "@/server/db/reportRepository";
import { getLLM } from "@/server/llm/llmClient";

export const dynamic = "force-dynamic";

/** Liveness + configuration truth, no secrets. */
export async function GET(): Promise<Response> {
  const store = await getReportStore();
  return json({
    status: "ok",
    provider: isMockMode() ? "mock" : "google",
    persistence: store.kind,
    platform: process.env.VERCEL ? "vercel" : "self-hosted",
    // On Vercel (serverless) in-memory stores are per-instance and lost on
    // cold start, so only a configured MongoDB counts as durable there.
    durable: store.kind !== "memory",
    llm: getLLM() ? "configured" : "template",
  });
}
