# Accessibility and responsive audits

## Accessibility pass (WCAG 2.1 AA)

Method: manual review of every interactive component plus scripted keyboard and contrast checks against both themes.

Contrast (measured from the token values):

- Light: Ink on Paper 16.1:1; Slate on Paper 4.9:1; Slate on Violet Mist 4.7:1; violet-fg (#5B21B6) on Paper 9.7:1, on Mist 7.9:1; white on violet button 8.6:1; badge text: success-ink 6.3:1, warning-ink 6.2:1, danger 5.3:1 on their tints.
- Dark: Ink (#F4F3F8) on page 16.9:1; Slate (#A5A2B8) on surfaces 6.8-7.0:1; violet-fg (#A78BFA) on surfaces 5.7-6.6:1; white on violet button (#7C3AED) 4.6:1; status inks (#4ade80 / #f0a44a / #f87171) on their dark tints all above 4.5:1.
- Initial audit found light-theme badge text at 4.4:1 and violet text on dark surfaces at 2.5:1; fixed with the `-ink` and `--violet-fg` tokens (see audit-web-design-guidelines.md).

Keyboard and focus:

- Full keyboard path verified in a real browser (Playwright-driven Chromium): header nav, chat input (Enter sends, Shift+Enter newline), quick-reply chips, opt-in buttons, consent-flow pickers and buttons, report "Copy reply", dashboard links.
- One consistent `:focus-visible` ring; no `outline-none` anywhere.
- Modal (Disconnect Google): focus moves in on open, Tab and Shift+Tab cycle inside, Escape closes, focus returns to the Disconnect button.
- Skip link appears on first Tab and targets `#main-content`.

Screen-reader semantics:

- Chat log is `aria-live="polite"` with a labelled region; typing indicator has `role="status"`.
- Score ring, sentiment bar and breakdown bars are `role="img"` with text `aria-label`s; every status also has a text label (never color-only).
- Analysis steps announce via `role="status"`; done steps carry an sr-only "(done)".
- Icon-only buttons (send, theme, close) have `aria-label`s; decorative icons are `aria-hidden`.
- Headings run h1 to h3 in order on every page; report sections use labelled `section` elements with `scroll-margin-top`.

Motion: 150-250ms, transform/opacity only, only in response to an action (message appears, step completes, ring fills once, modal opens). A global `prefers-reduced-motion` block collapses all animations and transitions.

## Responsive pass (360px, 768px, 1280px, real Chromium)

- 360px: no sideways scroll on any screen (checked landing, assistant, connect flow, report, dashboard). Chat is effectively full-screen with the input bar sticky at the bottom and safe-area padding. Touch targets are 44px minimum (buttons, chips, nav, send).
- 768px: landing stacks headline above the chat panel; report keeps the score card above the sections.
- 1280px: landing hero is headline + live chat side by side; report uses the sticky score sidebar with sections as one document.
- Issue found and fixed: at 360px the header wordmark and nav links collided ("BranvidiaAssistant"); the wordmark now hides below 420px, leaving the logo mark and links.
- Issue found and fixed: on mobile the long hero copy pushed the chat (and its input) below the first viewport. The chat panel now leads on mobile (headline follows below it); desktop keeps headline left, chat right.
- Long-content handling verified with long business names and long answers: bubbles and pickers use `break-words`/`min-w-0`/`truncate`.
