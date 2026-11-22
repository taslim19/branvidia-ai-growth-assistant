import { json } from "@/server/apiUtils";
import { skipOptInTurn } from "@/lib/chatFlow";
import { skipOptInBodySchema } from "@/server/apiSchemas";
import { isAllowedOrigin, originDeniedResponse } from "@/server/security/originCheck";
import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitPerMinute } from "@/server/security/rateLimiter";

export const dynamic = "force-dynamic";

/** The owner declined the Google connection: scripted tips turn. */
export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) return originDeniedResponse();
  if (!checkRateLimit(`chat:${clientIp(request)}`, rateLimitPerMinute())) {
    return rateLimitedResponse();
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json", message: "Request body must be JSON." }, 400);
  }
  const parsed = skipOptInBodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", message: "Expected {state}." }, 400);
  }
  return json(skipOptInTurn(parsed.data.state));
}
