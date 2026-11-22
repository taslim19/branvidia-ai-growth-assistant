"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

export function ChatInputBar({
  onSend,
  disabled,
  placeholder = "Type your answer…",
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    // Respect the disabled state on keyboard submit too: while the opening
    // question or a reply is in flight, keep the typed text instead of
    // silently dropping it.
    if (disabled) return;
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      data-chat-composer
      className="flex items-end gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <label htmlFor="chat-input" className="sr-only">
        Your message
      </label>
      <textarea
        id="chat-input"
        name="chat-message"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit(e);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-input border border-line bg-surface px-4 py-2.5 text-base text-ink placeholder:text-slate disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-violet text-violet-on transition-colors duration-fast hover:bg-violet-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
}
