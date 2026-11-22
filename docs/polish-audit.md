# Version 2 polish audit

Reviewed with frontend-design, then web-design-guidelines (bundled command rules).

## Findings fixed

- src/components/chat/ChatWindow.tsx: nested h-full compounded the progress header; replaced with min-height-zero flex sizing and a non-shrinking composer.
- src/components/chat/ChatInputBar.tsx: textarea flex child needed min-width-zero; added IME composition guard.
- src/app/globals.css: dark button hover white contrast was under 4.5:1; changed hover violet to #6D28D9.
- src/components/layout/ThemeToggle.tsx: now follows live system changes until a manual theme is saved.
- public/branvidia-logo.svg: official PNG traced to vectors; provenance in brand-source.md.

## Verified contrast

- Light ink on Paper: 17.38:1.
- Light slate on Paper: 5.14:1.
- Light white on Violet: 8.98:1.
- Dark ink on surface: 15.53:1.
- Dark slate on surface: 6.91:1.
- Dark white on Violet: 5.7:1.
- Dark white on hover: 7.1:1.

## Intentional brief overrides

- Exact requested input placeholder retained without an ellipsis.
- Existing sentence-case headings and text remain, per the design brief and writing style.
- Brand logotype retains the original violet; logotypes are exempt from text contrast requirements.

## Checks

Production build and TypeScript passed. Initial and long-conversation containment tested at 1366×768, 360×800 and 360×640, including chip clicks and five-answer intake. No horizontal overflow. System dark and persistent manual light passed. Existing npm lint command needs ESLint configuration and is not an automated audit pass.
