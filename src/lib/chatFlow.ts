import type {
  BusinessInfo,
  ChatMessage,
  FlowStepIndex,
} from "@/types";
import {
  CHAT_QUESTIONS,
  buildSummaryRows,
  buildSummaryText,
  buildGeneralTips,
  fillTemplate,
  OPT_IN_MESSAGE,
  SKIP_REPLY,
  CONNECT_LATER_NOTE,
} from "@/mock/chatScript";
import { answerQuestion, isEditRequest, isKeepCurrent, isQuestion, RESUME_PROMPTS } from "./chatFacts";

// Pure chat-flow logic: given the session state and what the user typed,
// decide the assistant's next messages. apiClient.sendChatMessage wraps this
// with the mock delay; the future backend replaces it, not the components.

export type ChatPhase = "asking" | "summary" | "optin" | "tips" | "awaiting-choice" | "analysis" | "done";

export interface ChatSessionState {
  questionIndex: number;
  phase: ChatPhase;
  info: Partial<BusinessInfo>;
}

export interface ChatTurnResult {
  replies: Omit<ChatMessage, "id" | "createdAt">[];
  state: ChatSessionState;
  step: FlowStepIndex;
}

export const initialChatState: ChatSessionState = {
  questionIndex: -1, // -1 means the opening question has not been sent yet
  phase: "asking",
  info: {},
};

export function openingTurn(): ChatTurnResult {
  const q = CHAT_QUESTIONS[0];
  return {
    replies: [{ role: "assistant", kind: "text", text: q.ask, quickReplies: q.quickReplies }],
    state: { questionIndex: 0, phase: "asking", info: {} },
    step: 1,
  };
}

const OPEN_PHASES: ChatPhase[] = ["asking", "optin", "tips", "awaiting-choice"];
const AFTER_INTAKE_CHIPS = ["Edit my answers", "What data do you access?", "Is it safe?"];

function currentStep(state: ChatSessionState): FlowStepIndex {
  return state.phase === "asking" ? (state.questionIndex <= 0 ? 1 : 2) : 3;
}

// Re-ask the question the user was on, in short form (no greeting repeated).
function resumeText(state: ChatSessionState): string {
  const q = CHAT_QUESTIONS[state.questionIndex];
  return q ? `Back to it: ${RESUME_PROMPTS[q.key] ?? q.ask}` : "";
}

function questionChips(state: ChatSessionState, base: string[]): string[] {
  const q = CHAT_QUESTIONS[state.questionIndex];
  return q && state.info[q.key] ? ["Keep current", ...base] : base;
}

export function processChatTurn(state: ChatSessionState, input: string): ChatTurnResult {
  const trimmed = input.trim();

  // Questions can be asked at any point. Answer from the fact sheet and
  // resume exactly where the conversation was; the state does not change.
  if (OPEN_PHASES.includes(state.phase) && isQuestion(trimmed)) {
    const answer = answerQuestion(trimmed);
    const replies: ChatTurnResult["replies"] = [
      { role: "assistant", kind: "text", text: answer.text, verbatim: true, quickReplies: state.phase === "asking" ? undefined : [...AFTER_INTAKE_CHIPS] },
    ];
    if (state.phase === "asking") {
      const q = CHAT_QUESTIONS[state.questionIndex];
      replies.push({
        role: "assistant",
        kind: "text",
        text: resumeText(state),
        verbatim: true,
        quickReplies: q ? questionChips(state, q.quickReplies) : undefined,
      });
    }
    return { replies, state, step: currentStep(state) };
  }

  // Go back and fix an answer. Existing answers are kept unless replaced.
  if (state.phase !== "asking" && OPEN_PHASES.includes(state.phase) && isEditRequest(trimmed)) {
    const next: ChatSessionState = { questionIndex: 0, phase: "asking", info: state.info };
    return {
      replies: [
        { role: "assistant", kind: "text", text: "Sure. Type a new answer, or tap Keep current to leave one as it is.", verbatim: true },
        { role: "assistant", kind: "text", text: resumeText(next), verbatim: true, quickReplies: questionChips(next, CHAT_QUESTIONS[0].quickReplies) },
      ],
      state: next,
      step: 1,
    };
  }

  // Post-opt-in free choices ("connect later" style chips on the tips card).
  if (state.phase === "tips") {
    return {
      replies: [
        {
          role: "assistant",
          kind: "text",
          text: "Whenever you’re ready, tap Connect Google and I’ll build the full report.",
        },
      ],
      state: { ...state, phase: "awaiting-choice" },
      step: 3,
    };
  }

  if (state.phase === "optin" || state.phase === "awaiting-choice") {
    return {
      replies: [
        {
          role: "assistant",
          kind: "text",
          text: "You can ask me anything about the Google connection, say “Edit my answers” to change something, or use the buttons above to continue.",
          verbatim: true,
          quickReplies: [...AFTER_INTAKE_CHIPS],
        },
      ],
      state,
      step: 3,
    };
  }

  if (state.phase !== "asking") {
    return { replies: [], state, step: 3 };
  }

  const q = CHAT_QUESTIONS[state.questionIndex];
  if (!q) return { replies: [], state, step: 2 };

  const kept = isKeepCurrent(trimmed) && state.info[q.key] ? state.info[q.key] : undefined;
  const info = { ...state.info, [q.key]: kept ?? trimmed };

  // More questions to ask.
  if (state.questionIndex < CHAT_QUESTIONS.length - 1) {
    const next = CHAT_QUESTIONS[state.questionIndex + 1];
    return {
      replies: [
        {
          role: "assistant",
          kind: "text",
          text: fillTemplate(next.ask, info),
          quickReplies: questionChips({ ...state, questionIndex: state.questionIndex + 1, info }, next.quickReplies),
        },
      ],
      state: { questionIndex: state.questionIndex + 1, phase: "asking", info },
      step: 2,
    };
  }

  // All five answers collected: show the summary, then the opt-in card.
  const full = info as BusinessInfo;
  return {
    replies: [
      {
        role: "assistant",
        kind: "summary",
        text: buildSummaryText(full),
        summaryRows: buildSummaryRows(full),
      },
      { role: "assistant", kind: "optin", text: OPT_IN_MESSAGE, quickReplies: [...AFTER_INTAKE_CHIPS] },
    ],
    state: { ...state, info, phase: "optin" },
    step: 3,
  };
}

export function skipOptInTurn(state: ChatSessionState): ChatTurnResult {
  const full = state.info as BusinessInfo;
  return {
    replies: [
      { role: "assistant", kind: "text", text: SKIP_REPLY },
      { role: "assistant", kind: "tips", text: "3 things you can do now:", tips: buildGeneralTips(full) },
      { role: "assistant", kind: "text", text: CONNECT_LATER_NOTE },
    ],
    state: { ...state, phase: "tips" },
    step: 3,
  };
}
