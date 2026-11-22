# Web Interface Guidelines audit (web-design-guidelines skill)

Method: read the skill's bundled `references/command.md` ruleset (pinned upstream commit 434b7f9, per the SKILL.md), then reviewed every file in `src/app` and `src/components` against each rule. First pass after the initial build, fixes applied, then a clean re-run.

## Pass 1 findings and fixes

## src/components/ui/Badge.tsx

src/components/ui/Badge.tsx:8 - success/warning tint badges at 4.4:1 text contrast, under 4.5:1 → added `--success-ink` (#166534) and `--warning-ink` (#92400E) tokens for badge text in light mode (dark mode already passed)
src/components/ui/Badge.tsx:10 - violet badge text fails on dark mist surface (2.5:1) → new `--violet-fg` token (#5B21B6 light / #A78BFA dark) for violet-as-text everywhere

## src/components/ui/Modal.tsx

src/components/ui/Modal.tsx:61 - `bg-ink/40` opacity modifier on a hex CSS variable does not generate (Tailwind can only alpha-mix rgb-triplets) → changed to `bg-black/40`
src/components/ui/Modal.tsx:56 - `<div>` with onClick (backdrop dismiss) → kept deliberately: close is also available via a labelled Close button and Escape, so pointer-only dismissal is not the sole path

## src/components/layout/SiteHeader.tsx

src/components/layout/SiteHeader.tsx:7 - `bg-paper/95` same opacity-on-var problem → solid `bg-paper`

## src/components/chat/ChatMessageBubble.tsx

src/components/chat/ChatMessageBubble.tsx:63 - `border-violet/30` same opacity-on-var problem → solid `border-violet`

## src/components/report/ProfileReviewSection.tsx

src/components/report/ProfileReviewSection.tsx:23 - dynamic class interpolation `text-${meta.tone}` is invisible to Tailwind's scanner → explicit `iconClass` values in the status map

## src/app/connect/google/page.tsx

src/app/connect/google/page.tsx:50 - loading state label missing ellipsis → "Loading accounts…"
src/app/connect/google/page.tsx:41 - em dash in copy → colon
src/app/connect/google/page.tsx:23 - completed connection routed back to the landing page, which cannot run analysis → analysis always continues on `/assistant`; cancel returns to the originating screen

## src/app/page.tsx

src/app/page.tsx:35 - em dash in copy → comma
src/app/page.tsx:78 - "reads your Google profile — reviews…" → colon
src/app/page.tsx - `?cancelled=1` return from the consent flow was unhandled on the landing chat → handled, opt-in card reappears with the "nothing was connected" message

## src/app/report/[reportId]/page.tsx

src/app/report/[reportId]/page.tsx:78 - "Name — optimization report" label-fragment pattern → heading "Optimization report" with the business name in the subtitle
src/app/report/[reportId]/page.tsx - business name not wrapped for translation protection → `translate="no"`

## src/app/dashboard/page.tsx

src/app/dashboard/page.tsx - loading state label missing ellipsis → "Loading saved analyses…"

## src/components/report/SuggestedReviewRepliesSection.tsx

src/components/report/SuggestedReviewRepliesSection.tsx:15 - em dash in copy → period
src/components/report/SuggestedReviewRepliesSection.tsx:35 - editable reply textarea missing `autoComplete="off"` (non-auth field) → added

## src/components/google/BusinessProfileSummary.tsx, src/components/dashboard/*

Business and brand names wrapped with `translate="no"` (locale rule)

## Multiple files (copy)

All em dashes in user-visible strings replaced with commas, colons or periods (chatScript.ts, reportContent.ts, hooks error messages, connect page, landing, replies section)

## Rules verified clean on pass 1

- Icon-only buttons all carry `aria-label` (theme toggle, modal close, chat send)
- Decorative icons `aria-hidden="true"`; meaningful charts have `role="img"` + `aria-label`, and status is never color-only (text labels accompany every bar, badge and ring)
- Chat uses `aria-live="polite"`; toasts `aria-live="polite"`; copy confirmation uses `role="status"`
- No `outline-none` without replacement; one global `:focus-visible` ring
- No `transition: all`; transitions list properties (`transition-colors`, `transition-[width]`)
- `prefers-reduced-motion` collapses all animation durations globally
- Placeholders end with `…`; loading labels end with `…`; curly quotes throughout copy
- Images carry explicit `width`/`height` and `alt`; below-fold photos lazy
- `color-scheme` set per theme; `<meta name="theme-color">` matches each theme background
- `touch-action: manipulation` on body; tap highlight disabled intentionally; chat input has safe-area padding
- Dates/numbers via `Intl.DateTimeFormat` / `Intl.NumberFormat` (en-IN); tabular numerals on scores and counts
- Destructive action (Disconnect Google) confirmed in a focus-trapped modal with focus restored on close
- Headings hierarchical with a skip link; report sections have `scroll-margin-top`
- Flex text containers use `min-w-0`/`truncate`/`break-words` for long user input

## Considered and accepted

- Consent-flow stage and chat session live in component state rather than the URL: these are ephemeral, multi-step wizard states; deep-linking a half-finished consent step would be worse UX. The shareable states (report id, dashboard) are real routes.
- No `beforeunload` guard on the chat: losing intake answers is low cost and the mock backend re-asks in seconds.

## Pass 2 (re-run after fixes)

All files in `src/app` and `src/components` re-checked against the ruleset: no remaining violations. `next build` (which also type-checks) passes.
