import { json } from "@/server/apiUtils";
import { openingTurn } from "@/lib/chatFlow";
import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitPerMinute } from "@/server/security/rateLimiter";
import { rewordReplies } from "@/server/chatAssist";

export const dynamic = "force-dynamic";

/** The first assistant question. Deterministic state machine; LLM may reword. */
export async function GET(request: Request): Promise<Response> {
  if (!checkRateLimit(`chat:${clientIp(request)}`, rateLimitPerMinute())) {
    return rateLimitedResponse();
  }
  const turn = openingTurn();
  const replies = await rewordReplies(turn.replies, undefined);
  return json({ ...turn, replies });
}
