"use client";

export function QuickReplyChips({
  options,
  onPick,
}: {
  options: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quick replies">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick(opt)}
          className="min-h-[44px] rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors duration-fast hover:bg-mist"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
