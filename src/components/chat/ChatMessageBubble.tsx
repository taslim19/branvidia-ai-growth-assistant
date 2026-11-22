"use client";

import type { ChatMessage } from "@/types";
import { GoogleOptInCard } from "@/components/optin/GoogleOptInCard";

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  onConnectGoogle: () => void;
  onSkipOptIn: () => void;
  connectLabel?: string;
}

export function ChatMessageBubble({
  message,
  onConnectGoogle,
  onSkipOptIn,
  connectLabel = "Connect Google",
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  if (message.kind === "optin") {
    return (
      <div className="message-in">
        {message.text ? (
          <p className="mb-2 max-w-prose70 rounded-card rounded-bl-sm bg-mist px-4 py-3 text-base text-ink">
            {message.text}
          </p>
        ) : null}
        <GoogleOptInCard onConnect={onConnectGoogle} onSkip={onSkipOptIn} connectLabel={connectLabel} />
      </div>
    );
  }

  if (message.kind === "summary") {
    return (
      <div className="message-in max-w-prose70 rounded-card rounded-bl-sm border border-line bg-surface px-4 py-3">
        <p className="text-base font-medium">{message.text}</p>
        <dl className="mt-2 space-y-1.5">
          {message.summaryRows?.map((row) => (
            <div key={row.label} className="flex gap-2 text-sm">
              <dt className="w-24 shrink-0 font-medium text-slate">{row.label}</dt>
              <dd className="min-w-0 break-words text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (message.kind === "tips") {
    return (
      <div className="message-in max-w-prose70 rounded-card rounded-bl-sm border border-line bg-surface px-4 py-3">
        <p className="text-base font-medium">{message.text}</p>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-base text-ink">
          {message.tips?.map((tip, i) => <li key={i}>{tip}</li>)}
        </ol>
      </div>
    );
  }

  if (message.kind === "notice") {
    return (
      <div className="message-in max-w-prose70 rounded-card rounded-bl-sm border border-violet/30 bg-mist px-4 py-3">
        <p className="text-base text-ink">{message.text}</p>
      </div>
    );
  }

  return (
    <div className={`message-in flex ${isUser ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-prose70 whitespace-pre-wrap break-words px-4 py-3 text-base ${
          isUser
            ? "rounded-card rounded-br-sm bg-violet text-violet-on"
            : "rounded-card rounded-bl-sm bg-mist text-ink"
        }`}
      >
        {message.text}
      </p>
    </div>
  );
}
