import { z } from "zod";
import type { ChatMessage } from "@/types";
import { CHAT_QUESTIONS } from "@/mock/chatScript";
import type { ChatSessionState } from "@/lib/chatFlow";
import { getLLM, LlmError, type LlmClient } from "./llm/llmClient";

/**
 * The chat step state machine (src/lib/chatFlow.ts) stays deterministic.
 * The LLM's only jobs: extract the intake field value from the user's free
 * text, and word the assistant's replies. Without an LLM key both fall back
 * to the scripted behavior (trimmed input, scripted wording).
 */

const extractSchema = z.object({ value: z.string().min(1).max(300) });
const rewordSchema = z.object({ text: z.string().min(1).max(2000) });

const FIELD_LABELS: Record<string, string> = {
  name: "the business name",
  category: "the kind of business",
  productsServices: "what the business mainly sells or offers",
  targetCustomers: "who the usual customers are",
  goals: "what the owner wants more of",
};

export async function extractFieldValue(
  state: ChatSessionState,
  input: string,
  llm: LlmClient | null = getLLM(),
): Promise<string> {
  const trimmed = input.trim();
  const question = CHAT_QUESTIONS[state.questionIndex];
  if (!llm || !question) return trimmed;
  try {
    const { value } = await llm.completeJSON(
      "chatExtract",
      "You extract one short field value from a small-business owner's chat reply. Reply with JSON only.",
      `The owner was asked for ${FIELD_LABELS[question.key] ?? question.key}. ` +
        `Their reply: ${JSON.stringify(trimmed)}\n\n` +
        'Return {"value": "..."} with just that field value, in the owner\'s own words, under 120 characters.',
      extractSchema,
    );
    return value;
  } catch (err) {
    // Extraction must never break the conversation; the raw reply is fine.
    if (err instanceof LlmError) {
      console.warn(`[branvidia] chat extraction fell back. stage=${err.task ?? "chatExtract"} category=${err.category}` +
        (err.httpStatus ? ` httpStatus=${err.httpStatus}` : ""));
    }
    return trimmed;
  }
}

type Reply = Omit<ChatMessage, "id" | "createdAt">;

/** Reword plain-text assistant replies; structured cards keep their payloads. */
export async function rewordReplies(
  replies: Reply[],
  businessName: string | undefined,
  llm: LlmClient | null = getLLM(),
): Promise<Reply[]> {
  if (!llm) return replies;
  return Promise.all(
    replies.map(async (reply) => {
      if (reply.kind !== "text" || reply.verbatim) return reply;
      try {
        const { text } = await llm.completeJSON(
          "chatReword",
          "You are Branvi, Branvidia's friendly growth assistant for small businesses. " +
            "Reword the given message in your warm, plain voice. Keep every fact, name and question identical. " +
            "Reply with JSON only.",
          `${businessName ? `The business is called ${businessName}. ` : ""}` +
            `Message: ${JSON.stringify(reply.text)}\n\nReturn {"text": "..."}.`,
          rewordSchema,
        );
        return { ...reply, text };
      } catch (err) {
        if (err instanceof LlmError) {
          console.warn(`[branvidia] chat reword fell back. stage=${err.task ?? "chatReword"} category=${err.category}` +
            (err.httpStatus ? ` httpStatus=${err.httpStatus}` : ""));
        }
        return reply;
      }
    }),
  );
}
