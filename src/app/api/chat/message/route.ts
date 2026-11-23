import { json } from "@/server/apiUtils";
import { processChatTurn } from "@/lib/chatFlow";
import { chatMessageBodySchema } from "@/server/apiSchemas";
import { isAllowedOrigin, originDeniedResponse } from "@/server/security/originCheck";
import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitPerMinute } from "@/server/security/rateLimiter";
import { extractFieldValue, rewordReplies } from "@/server/chatAssist";
import { CHAT_QUESTIONS } from "@/mock/chatScript";
import { isKeepCurrent, isQuestion } from "@/lib/chatFacts";

export const dynamic = "force-dynamic";

/**
 * One chat turn. The step state machine from src/lib/chatFlow.ts decides
 * everything deterministic; the LLM only extracts the intake field value
 * from free text and rewords the scripted replies.
 */
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
  const parsed = chatMessageBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "invalid_body", message: "Expected {state, input} with a non-empty input." },
      400,
    );
  }
  const { state, input } = parsed.data;

  const value =
    state.phase === "asking" && CHAT_QUESTIONS[state.questionIndex] && !isQuestion(input) && !isKeepCurrent(input)
      ? await extractFieldValue(state, input)
      : input.trim();
  const turn = processChatTurn(state, value);
  const replies = await rewordReplies(turn.replies, turn.state.info.name);
  return json({ ...turn, replies });
}
