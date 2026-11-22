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

export function processChatTurn(state: ChatSessionState, input: string): ChatTurnResult {
  const trimmed = input.trim();

  // Post-opt-in free choices ("connect later" style chips on the tips card).
  if (state.phase === "tips") {
    return {
      replies: [
        {
          role: "assistant",
          kind: "text",
          text: "Whenever you’re ready, tap Connect Google and I’ll build the full report from your profile.",
        },
      ],
      state: { ...state, phase: "awaiting-choice" },
      step: 3,
    };
  }

  if (state.phase !== "asking") {
    return { replies: [], state, step: 3 };
  }

  const q = CHAT_QUESTIONS[state.questionIndex];
  if (!q) return { replies: [], state, step: 2 };

  const info = { ...state.info, [q.key]: trimmed };

  // More questions to ask.
  if (state.questionIndex < CHAT_QUESTIONS.length - 1) {
    const next = CHAT_QUESTIONS[state.questionIndex + 1];
    return {
      replies: [
        {
          role: "assistant",
          kind: "text",
          text: fillTemplate(next.ask, info),
          quickReplies: next.quickReplies,
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
      { role: "assistant", kind: "optin", text: OPT_IN_MESSAGE },
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
