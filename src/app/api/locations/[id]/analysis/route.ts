import { json, providerErrorResponse } from "@/server/apiUtils";
import { isMockMode } from "@/server/providers";
import { readSessionFromRequest } from "@/server/oauthSessions";
import { analysisBodySchema, locationIdSchema } from "@/server/apiSchemas";
import { isAllowedOrigin, originDeniedResponse } from "@/server/security/originCheck";
import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitPerMinute } from "@/server/security/rateLimiter";
import { buildAndSaveReport } from "@/server/analysis/reportBuilder";
import { LlmError } from "@/server/llm/llmClient";

export const dynamic = "force-dynamic";
// Two sequential stages, each capped at 3 attempts per call (30s default).
export const maxDuration = 200;

/**
 * Runs the AI pipeline for one location, saves the Report and returns it.
 * LLM exhaustion returns a fully template-generated, source-labeled report.
 * Data-provider failures still return a clear error.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (!isAllowedOrigin(request)) return originDeniedResponse();
  if (!checkRateLimit(`analysis:${clientIp(request)}`, rateLimitPerMinute())) {
    return rateLimitedResponse();
  }
  const locationId = locationIdSchema.safeParse(params.id);
  if (!locationId.success) {
    return json({ error: "invalid_location", message: "Invalid location id." }, 400);
  }
  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return json({ error: "invalid_json", message: "Request body must be JSON." }, 400);
  }
  const parsed = analysisBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", message: "Expected {intake?}." }, 400);
  }

  const session = await readSessionFromRequest(request);
  if (!isMockMode() && !session) {
    return json(
      { error: "not_connected", message: "No Google session. Start the OAuth flow first." },
      401,
    );
  }
  try {
    const report = await buildAndSaveReport({
      locationId: locationId.data,
      intake: parsed.data.intake,
      tokens: session?.tokens ?? null,
    });
    return json(report);
  } catch (err) {
    if (err instanceof LlmError) {
      return json(
        { error: "analysis_failed", message: "The AI pipeline could not complete: " + err.message },
        502,
      );
    }
    return providerErrorResponse(err);
  }
}
