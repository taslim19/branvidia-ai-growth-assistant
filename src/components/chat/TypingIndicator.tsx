export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="The assistant is typing"
      className="message-in inline-flex items-center gap-1.5 rounded-card rounded-bl-sm bg-mist px-4 py-3"
    >
      <span className="typing-dot h-2 w-2 rounded-full bg-slate" style={{ animationDelay: "0ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-slate" style={{ animationDelay: "150ms" }} />
      <span className="typing-dot h-2 w-2 rounded-full bg-slate" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
