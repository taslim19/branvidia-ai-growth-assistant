import { json } from "@/server/apiUtils";
import { CANCELLED_MESSAGE } from "@/mock/chatScript";
import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitPerMinute } from "@/server/security/rateLimiter";

export const dynamic = "force-dynamic";

/** The owner cancelled on the (simulated) Google consent screen. */
export async function GET(request: Request): Promise<Response> {
  if (!checkRateLimit(`chat:${clientIp(request)}`, rateLimitPerMinute())) {
    return rateLimitedResponse();
  }
  return json({ message: CANCELLED_MESSAGE });
}
