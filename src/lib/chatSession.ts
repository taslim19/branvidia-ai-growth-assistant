import type { ChatMessage } from "@/types";
import { CHAT_QUESTIONS, CANCELLED_MESSAGE } from "@/mock/chatScript";
import { openingTurn, processChatTurn, skipOptInTurn, type ChatSessionState } from "./chatFlow";

export const SESSION_KEY = "branvidia:chat-session-v2";
export const LAST_REPORT_KEY = "branvidia:last-report-v1";
// The display text can differ from the intake value extracted by the backend.
// Keep both, so replay uses the same answer as the original state transition.
export interface SessionMessage extends ChatMessage { intakeValue?: string }
export interface SessionSnapshot { version: 2; state: ChatSessionState; messages: SessionMessage[] }
export function stepForSession(state: ChatSessionState): number {
  if (state.phase === "asking") return state.questionIndex <= 0 ? 1 : 2;
  if (state.phase === "analysis") return 6;
  return 3;
}
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
function content(m: SessionMessage) {
  return { role: m.role, kind: m.kind, text: m.text, quickReplies: m.quickReplies,
    summaryRows: m.summaryRows, tips: m.tips, intakeValue: m.intakeValue };
}
// Replay transitions and exact structured payloads, not a stored step or phase.
// Plain assistant text is presentation only: the backend may reword it with AI.
// This checks consistency, not authenticity of client storage. No stored value
// authorizes Google access or replaces the server's own request validation.
// Unknown fields never become rendering instructions.
export function validateSession(value: unknown): SessionSnapshot | null {
  try {
    const p = value as SessionSnapshot;
    if (p?.version !== 2 || !p.state || !Array.isArray(p.messages) || p.messages.length > 100) return null;
    if (!["asking", "optin", "tips", "awaiting-choice"].includes(p.state.phase)) return null;
    if (!p.messages.every(m => m && typeof m.id === "string" && typeof m.createdAt === "string" && Number.isFinite(Date.parse(m.createdAt)) && typeof m.text === "string" && m.text.length <= 10000)) return null;
    if (!p.messages.every(m =>
      (m.quickReplies === undefined || (Array.isArray(m.quickReplies) && m.quickReplies.every(x => typeof x === "string"))) &&
      (m.tips === undefined || (Array.isArray(m.tips) && m.tips.every(x => typeof x === "string"))) &&
      (m.summaryRows === undefined || (Array.isArray(m.summaryRows) && m.summaryRows.every(x => x && typeof x.label === "string" && typeof x.value === "string")))
    )) return null;
    if (!p.messages.every(m => m.intakeValue === undefined ||
      (m.role === "user" && m.kind === "text" && typeof m.intakeValue === "string" &&
       m.intakeValue.trim().length > 0 && m.intakeValue.length <= 1000))) return null;
    if (new Set(p.messages.map(m => m.id)).size !== p.messages.length) return null;
    let state = openingTurn().state;
    let cursor = 0;
    const consume = (replies: ReturnType<typeof openingTurn>["replies"]) => {
      for (const reply of replies) {
        const actual = p.messages[cursor];
        if (!actual) throw new Error("missing reply");
        const expected = content(reply as ChatMessage);
        const displayed = content(actual);
        // Only plain assistant wording may vary. Role, kind, quick replies,
        // tips and summary rows still have to match the replay exactly.
        if (reply.role === "assistant" && reply.kind === "text") {
          if (!actual.text.trim()) throw new Error("empty reply");
          displayed.text = expected.text;
        }
        if (!same(displayed, expected)) throw new Error("transcript mismatch");
        cursor++;
      }
    };
    consume(openingTurn().replies);
    while (cursor < p.messages.length) {
      const m = p.messages[cursor];
      if (m.role === "user" && m.kind === "text" && m.text.trim() && (state.phase === "asking" || state.phase === "tips")) {
        cursor++;
        if (m.quickReplies !== undefined || m.summaryRows !== undefined || m.tips !== undefined) return null;
        if (state.phase !== "asking" && m.intakeValue !== undefined) return null;
        const turn = processChatTurn(state, m.intakeValue ?? m.text);
        state = turn.state; consume(turn.replies);
      } else if (state.phase === "optin" && m.kind === "optin" && m.role === "assistant" && m.text === CANCELLED_MESSAGE) {
        consume([{role: "assistant", kind: "optin", text: CANCELLED_MESSAGE}]);
      } else if (state.phase === "optin") {
        const turn = skipOptInTurn(state); state = turn.state; consume(turn.replies);
      } else return null;
    }
    if (state.phase !== p.state.phase || state.questionIndex !== p.state.questionIndex) return null;
    for (const q of CHAT_QUESTIONS) if (state.info[q.key] !== p.state.info?.[q.key]) return null;
    if (Object.keys(p.state.info).length !== Object.keys(state.info).length) return null;
    return { version: 2, state, messages: p.messages.map(m => ({...content(m), id:m.id, createdAt:m.createdAt})) };
  } catch { return null; }
}
