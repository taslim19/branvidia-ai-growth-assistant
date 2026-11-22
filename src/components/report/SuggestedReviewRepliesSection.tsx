"use client";

import { useState } from "react";
import type { ReviewReplyDraft } from "@/types";
import { ReportSection } from "./ReportSection";
import { Button } from "@/components/ui/Button";
import { InlineToast } from "@/components/ui/Toast";
import { Star } from "lucide-react";

export function SuggestedReviewRepliesSection({ drafts }: { drafts: ReviewReplyDraft[] }) {
  return (
    <ReportSection id="review-replies" title="Suggested review responses">
      <p className="mb-4 max-w-prose70 text-base text-slate">
        Drafts for reviews that still have no reply. Edit them so they sound like you, then post
        them from your Google account. Branvidia never posts for you.
      </p>
      <ul className="space-y-4">
        {drafts.map((d) => (
          <DraftCard key={d.reviewId} draft={d} />
        ))}
      </ul>
    </ReportSection>
  );
}

function DraftCard({ draft }: { draft: ReviewReplyDraft }) {
  const [text, setText] = useState(draft.draft);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <li className="rounded-input border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold">{draft.author}</p>
        <span
          className="inline-flex items-center gap-1 text-sm text-slate"
          aria-label={`${draft.rating} out of 5 stars`}
        >
          <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
          {draft.rating}
        </span>
      </div>
      <blockquote className="mt-1 border-l-2 border-line pl-3 text-sm text-slate">
        {draft.reviewExcerpt}
      </blockquote>
      <label htmlFor={`reply-${draft.reviewId}`} className="sr-only">
        Edit the reply to {draft.author}
      </label>
      <textarea
        id={`reply-${draft.reviewId}`}
        name={`reply-${draft.reviewId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        autoComplete="off"
        className="print-hidden mt-3 w-full rounded-input border border-line bg-surface px-3 py-2 text-base text-ink"
      />
      {/* Print shows the full reply as plain text; a textarea clips overflow. */}
      <p className="hidden whitespace-pre-wrap print:mt-3 print:block print:rounded-input print:border print:border-line print:px-3 print:py-2 print:text-base print:text-ink">
        {text}
      </p>
      <div className="print-hidden mt-2 flex items-center gap-3">
        <Button variant="secondary" onClick={() => void copy()}>
          Copy reply
        </Button>
        <InlineToast message={copied ? "Reply copied" : null} />
      </div>
    </li>
  );
}
