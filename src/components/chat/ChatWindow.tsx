"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickReplyChips } from "./QuickReplyChips";
import { CHAT_QUESTIONS } from "@/mock/chatScript";
import { ChatInputBar } from "./ChatInputBar";

export interface ChatWindowProps {
  messages: ChatMessage[];
  typing: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onConnectGoogle: () => void;
  onSkipOptIn: () => void;
  connectLabel?: string;
  /** Compact mode (landing embed) hides nothing but uses tighter padding. */
  compact?: boolean;
}

export function ChatWindow({
  messages,
  typing,
  error,
  onSend,
  onConnectGoogle,
  onSkipOptIn,
  connectLabel = "Connect Google",
  compact = false,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastMessage = messages[messages.length - 1];
  const quickReplies = !typing && lastMessage?.role === "assistant"
    ? lastMessage.quickReplies?.length
      ? lastMessage.quickReplies
      : lastMessage.kind === "text" && !messages.some((m) => m.role === "user")
        ? CHAT_QUESTIONS[0].quickReplies
        : undefined
    : undefined;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        aria-live="polite"
        aria-label="Conversation with the Branvidia assistant"
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain ${compact ? "p-4" : "p-4 sm:p-6"}`}
      >
        {messages.map((m) => (
          <ChatMessageBubble
            key={m.id}
            message={m}
            onConnectGoogle={onConnectGoogle}
            onSkipOptIn={onSkipOptIn}
            connectLabel={connectLabel}
          />
        ))}
        {quickReplies && quickReplies.length > 0 ? (
          <QuickReplyChips options={quickReplies} onPick={onSend} />
        ) : null}
        {typing ? <TypingIndicator /> : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 border-t border-line">
        <ChatInputBar onSend={onSend} disabled={typing} placeholder={messages.some((m) => m.role === "user") ? "Type your answer…" : "Type your business name…"} />
      </div>
    </div>
  );
}
