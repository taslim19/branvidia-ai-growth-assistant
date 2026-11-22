# Independent QA findings and resolutions (round 2)

After the first delivery, two independent reviewers (functional QA and design QA) ran the build in a real browser. Their findings and what changed, each re-verified in Chromium against the production build:

## Security

- Next.js 14.2.15 was flagged by the official advisory (nextjs.org/blog/security-update-2025-12-11). Upgraded to 14.2.35 (latest patched 14.2.x). Fresh install + build + full browser pass re-run.

## State, timing and lifecycle

- Disconnect failure still showed the "Google disconnected" toast. The hook swallowed the error. Now `disconnect()` throws, the button stays in the modal with the error text, and the toast only fires on success. Verified with a forced `disconnectGoogle` failure: error shown, no success toast.
- A successful disconnect immediately restarted the account picker (auto-begin loop on the idle stage). Now a successful disconnect lands on an explicit "Disconnected" state with a Connect Google button; the picker does not restart. Verified.
- The mock analysis resolved in ~900ms while the visible stages ran to 4.4s, so "Reviewing photos" and "Writing your report" were skipped and timers leaked. The run now awaits the full stage sequence together with the analysis call, every stage displays in order, and timers are cleaned up on completion and unmount. Verified: all 4 stages seen in order before redirect.
- Cancelling the consent flow back on the landing page reset the chat: the late opening question overwrote the cancellation notice and typed answers were lost. The chat session now persists to localStorage and restores across navigation; the cancel/connected notices are gated on a `ready` flag so initialization can never overwrite them. Verified: answers kept, "Nothing was connected" shown, opt-in buttons return.
- The second location (Koramangala) returned the Indiranagar profile and report, and every report shared one static id, so dashboard history overwrote itself. Now each location has its own profile, review set, problems, reply drafts, next steps, score and breakdown; report ids are unique per run; typed intake answers flow into the report's Business overview. Verified: Koramangala summary shows 3.9/14 reviews, its report id and content differ, two saved reports coexist.
- Blocked localStorage crashed the app before render (unguarded read in ThemeToggle). All storage access is now wrapped in try/catch with a system-preference fallback. Verified with storage fully denied: landing, chat and dashboard render, zero page errors.

## Copy honesty

- Suggested review replies invented completed operational changes ("we are adding a second barista", "we have changed how orders are queued") and a free-drink offer. Replies now acknowledge, apologize and invite the reviewer back without claiming anything was done or promised.
- Unsupported outcome claims removed: "100+ word descriptions get more discovery searches", "people photos get more views", "varied photos get more direction requests", the skip-tip photo claim. All advice is now practical and non-causal.
- The 12-word profile description is literally 12 words (counted).

## Design and accessibility

- Score breakdown used "Profile · 35%" dot meta strings, which the brief forbids. Now "Profile (35% of score)", and each subscore carries a text quality label (Needs attention / Good progress / …) so nothing is color-or-number-only. Dot separators removed everywhere (SavedReportCard, BusinessProfileSummary, dashboard, page-title template).
- On mobile the hero copy pushed the chat (and its input) below the first viewport. The chat now leads on mobile with a fluid `100dvh` height; measured input positions: 702px at 360x800, 606px at 768x800 (both inside the first viewport). Desktop keeps headline left, chat right.
- UI borders measured 1.27:1 (light) and 1.36:1 (dark), below the 3:1 UI-contrast requirement. `--line` strengthened to #8f8ba3 (3.3:1 on white, 3.2:1 on Paper) and #6e6a80 (3.3:1 on dark surface, 3.4:1 on dark Paper).
- The 10-step progress was only visible during chat. It now also shows on the consent screens (steps 4-5), through analysis (steps 6-9), and on the report (step 10).
- Mock dependency leak: useChatSession imported the mock chat script directly; the cancellation message now comes through apiClient like everything else.
- Hard-coded overlay/shadow/print colors moved to tokens in globals.css (`--overlay`, `--shadow-color`, `--print-paper`, `--print-ink`).

## Regression notes

- Print export produces a readable single-document report with all 8 sections and edited replies. Round 2 checked this in light mode only; the dark-mode case is covered in round 3 below.
- docs/audit-web-design-guidelines.md and docs/audits.md remain accurate for round 1; this file is the round-2 and round-3 record.

## Round 3: final acceptance blockers

- New analysis with localStorage denied completed but redirected to a report URL that then showed not found: persistence swallowed the write failure and there was no in-memory fallback. Reports now always land in a module-level in-memory cache (localStorage remains the durable store when available), getReport reads memory first, and the report page shows an honest warning when a report could not be saved: browser storage unavailable, readable now, not in dashboard history. The chat session gets the same treatment (in-memory mirror), so typed intake answers also survive navigation with storage denied. Verified end to end with storage fully denied: unique report URL, full 8-section content, intake name in the report, warning visible, dashboard still renders, zero page errors.
- Printing while dark mode was active kept the dark palette: the print stylesheet overrode body colors but component colors resolve through CSS variables, so dark surfaces printed dark (score black-on-dark) and dark text colors printed near-white on white. The print media query now redefines the entire palette to the light values, so every component repaints for print regardless of the active theme. Verified by exporting an actual PDF with dark mode active and inspecting the pages (evidence: docs/screenshots/23-print-from-dark-mode.png): white surfaces, dark ink, readable score, badges and tables.
