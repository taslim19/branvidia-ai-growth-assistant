# Branvidia AI Growth Assistant

Full-stack Next.js build of the Branvidia AI Growth Assistant. A customer chats with an AI assistant about their business, optionally connects their Google Business Profile after an explicit opt-in, and receives an AI optimization report. The backend is Next.js route handlers under `src/app/api/` (chat, analysis, reports, health), with an AI pipeline (`src/server/analysis/`), a provider-agnostic LLM client (`src/server/llm/`) and MongoDB persistence (`src/server/db/`). With no MongoDB and no LLM key everything still runs end to end: in-memory stores plus a deterministic template generator.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + lucide-react. Charts are hand-built SVG. Request bodies are validated with zod; reports and OAuth sessions persist in MongoDB (official driver) when `MONGODB_URI` is set, otherwise in memory with a startup warning. The default mock mode needs no keys or secrets.

## Setup

```bash
cp .env.example .env.local   # NEXT_PUBLIC_USE_MOCK=true is the default
npm install
npm run dev
```

Then open http://localhost:3000.

Other scripts: `npm run build` (production build), `npm start` (serve the build), `npm run lint`.

## How mock mode works

Every data call in the UI goes through the typed functions in `src/lib/apiClient.ts` (`sendChatMessage`, `startGoogleConnect`, `listBusinessLocations`, `getBusinessProfile`, `runAnalysis`, `getReport`, `listReports`, `disconnectGoogle`). With `NEXT_PUBLIC_USE_MOCK=true` each function resolves from `src/mock/` after a short simulated delay: realistic but deliberately flawed data for Brew & Bean Café, Indiranagar. Components never import mock data directly.

To test error states, force a failure for any function two ways:

- Add `?fail=<functionName>` to the URL, e.g. `/connect/google?fail=listBusinessLocations`
- Or in devtools: `localStorage.setItem('branvidia:fail:runAnalysis', '1')` (remove the key to clear)

The sample report is always reachable at `/report/brew-and-bean-2026-11-21`. Reports you run get unique ids and are saved to `localStorage` (wrapped in try/catch) and listed on `/dashboard`, grouped by business. The chat session also persists locally so navigating into the consent flow and back never loses the conversation; “Run a new analysis” starts a clean intake.

## Mock provider, and the real Google path behind USE_MOCK=false

The app is fully functional without any Google credentials. That is the default and nothing else is needed to run, test or demo it.

Server-side, every Google feature goes through one interface, `BusinessProfileProvider` (`src/server/providers/types.ts`):

- `MockBusinessProfileProvider` (default, `USE_MOCK` unset or `true`): the complete provider - accounts, locations, profiles and even a simulated OAuth handshake - served from `src/mock/`. No credentials, no network.
- `GoogleBusinessProfileProvider` (only when `USE_MOCK=false`): the complete real code path. OAuth 2.0 with PKCE (authorization URL, code exchange, token refresh, revocation) against `accounts.google.com` / `oauth2.googleapis.com`, and live data from the Business Profile Account Management, Business Information and legacy GMB APIs, mapped into the app's `BusinessProfile` type with field checks computed from the real location resource. It needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (and optionally `GOOGLE_OAUTH_REDIRECT_URI`); without them it fails fast with a clear `not_configured` error instead of breaking the app.

Built-in API endpoints (Next.js route handlers, all going through the selected provider):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/oauth/google/start` | OAuth step 1: redirect to the provider's consent URL (mock: simulated; real: Google) |
| `GET /api/oauth/google/callback` | OAuth step 2: validate one-time state, exchange code, store session server-side, set HttpOnly cookie |
| `POST /api/google/connect` | List the connected user's Google accounts (real mode: 401 until connected) |
| `GET /api/google/accounts/:accountId/locations` | List business locations for an account |
| `GET /api/google/locations/:locationId/profile` | Full business profile with computed field checks |
| `POST /api/google/disconnect` | Revoke the token, drop the session, clear the cookie |

With `NEXT_PUBLIC_USE_MOCK=false`, the frontend's Google calls in `src/lib/apiClient.ts` use these same-origin routes automatically (a missing session redirects the browser into the OAuth flow). Types shared with the backend live in `src/types/index.ts`.

## Live-backend mode (Phase 2)

Set `NEXT_PUBLIC_API_BASE_URL=/api` and restart. Chat, analysis and report calls in `src/lib/apiClient.ts` then go to the built-in route handlers instead of the client-side mock; without the variable, mock mode is byte-for-byte unchanged. The Google provider still follows `USE_MOCK`, so live-backend mode runs with zero credentials on the mock provider, and `USE_MOCK=false` layers the real Google path on top.

Routes added:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Status: provider, persistence store, LLM mode. No secrets. |
| `GET /api/chat/opening` | First assistant question (deterministic state machine) |
| `POST /api/chat/message` | One chat turn; LLM only extracts the intake field from free text and rewords the scripted replies |
| `POST /api/chat/skip-opt-in` | The opt-in-declined tips turn |
| `GET /api/chat/cancelled` | The consent-cancelled message |
| `POST /api/locations/:id/analysis` | Runs the AI pipeline, saves and returns the `Report` |
| `GET /api/reports` | Saved report summaries for the dashboard |
| `GET /api/reports/:id` | One saved report in full |

### AI pipeline (`src/server/analysis/`)

Focused passes run with `Promise.all`: `profileAudit`, `reviewAnalysis` (per-review sentiment + themes) and `photoAnalysis` (missing types computed in code; content ideas worded), then `synthesis` (problems, suggestions, next steps) and `reviewReplies` (tone-matched drafts, careful with negative reviews, never promises refunds). Prompts live in `src/server/prompts/*.md`. The route sets `maxDuration = 60` and any pipeline failure returns a clear error; it never returns a partial or fabricated report.

Every number is computed in code (`scoreCalculator.ts`), never by the LLM: the overall score is the weighted sum (Profile 35, Reviews 30, Photos 20, Engagement 15), rounded exactly once; sentiment counts and the reply rate count the actual fetched review records only - never extrapolated to the profile's headline review count, which stays visible as `overview.profile.reviewCount`. Reviews and photos come from the selected provider in every mode: the mock provider serves the bundled fixtures, and the Google provider maps the real GMB reviews/media responses record by record (`getRecentReviews` / `getRecentPhotos`); a failed fetch fails the analysis clean rather than producing a partial report. The Google adapter is unit-tested against injected fixtures only - it has never run against live Google without credentials.

### LLM client (`src/server/llm/`)

Provider-agnostic server-only wrapper supports **OpenAI**, **Anthropic**, and **Google Gemini**. OpenAI-compatible services can use `LLM_BASE_URL`. Gemini uses Google's `generateContent` REST endpoint with the key in `x-goog-api-key`, never in the URL. Every model reply is JSON-parsed and validated with the task's zod schema. One invalid-JSON/schema correction is allowed. HTTP 429 and timeouts allow up to two retries with 250ms then 500ms backoff. These policies share a maximum of **three HTTP attempts per pipeline task**, so retries cannot multiply.

For Gemini, set these host environment variables (server-side, not browser variables):

```dotenv
LLM_PROVIDER=gemini
LLM_API_KEY=<set privately in the host secret/environment settings>
LLM_MODEL=gemini-3.5-flash
LLM_TIMEOUT_MS=8000
NEXT_PUBLIC_API_BASE_URL=/api
```

The first three select and authenticate Gemini. `LLM_TIMEOUT_MS` is optional (default 30000 per attempt); 8000 is recommended for a quicker fallback. `NEXT_PUBLIC_API_BASE_URL=/api` selects this app's backend, contains no secret, and must be set at build time for the browser bundle. It is already enabled on the current preview host. Restart the app after changing server environment variables. Do not paste keys into chat or commit an env file. Never name a key variable `NEXT_PUBLIC_*`.

`LLM_MODEL` is required for Gemini: the adapter has **no hard-coded Gemini model fallback**. The example above is the stable Flash model shown in Google's catalog when checked on November 22, 2026. Verify your key/project has access before switching to another model. Official references: https://ai.google.dev/gemini-api/docs/models?authuser=6 and https://ai.google.dev/api?authuser=19 . `LLM_BASE_URL` is ignored for Gemini to prevent accidentally sending its key to another host.

Without a key, or with unsupported provider/missing Gemini model, templates run without any LLM request. If any LLM task exhausts retries or returns invalid output, the whole report is rebuilt deterministically from templates and saved/returned with `source: "template"`. A fully successful LLM pipeline has `source: "llm"`. Source is independent of Google/mock input-data selection. Google data-fetch failures still fail clearly, rather than inventing business data. Parallel sibling tasks finish before fallback; no new synthesis/reply LLM calls start after a first-stage failure. At most three calls run concurrently in stage one, then two in stage two. Hosts should allow about 200 seconds for the route when using the default 30-second timeout; with the recommended 8-second timeout, the two-stage worst case is about 50 seconds.

Keys are read only by server code. Provider response bodies, raw error messages, prompts and headers are not logged or returned. Gemini sends the key only to Google's API via its authentication header. `.gitignore` excludes `.env*` except the secret-free `.env.example`; never add a real key to source. Tests use a fake sentinel key, intercept all fetches, and check logs and responses for leaks. No actual LLM key or paid call was used for verification. Photo analysis currently uses photo metadata/types; raw image input is optional and is not enabled by this change.

### Persistence (`src/server/db/`)

`mongoClient.ts` is a lazy singleton over the official MongoDB driver. `reportRepository.ts` stores reports; `sessionRepository.ts` stores OAuth sessions and one-time OAuth states with TTL indexes (they expire themselves), the token set encrypted at rest with AES-256-GCM (`TOKEN_ENCRYPTION_KEY`; hex, base64 or passphrase). The browser cookie still holds only an opaque random session id. If `MONGODB_URI` is unset, both fall back to in-memory with a startup warning; if Mongo is set without `TOKEN_ENCRYPTION_KEY`, sessions stay in memory rather than store tokens unencrypted.

### Security additions

`SESSION_COOKIE_SECURE` / `SESSION_COOKIE_SAMESITE` configure cookie flags (SameSite=None forces Secure). All state-changing routes check the `Origin` header against the request host plus `ALLOWED_ORIGINS`. `/api/chat/*` and the analysis route are rate limited per client (`RATE_LIMIT_PER_MINUTE`, default 30). Request bodies and intake fields have length limits. Tokens, review text and PII stay out of logs.

**Flag sync:** `USE_MOCK` and `NEXT_PUBLIC_USE_MOCK` are aliases for one switch. The server resolves the mode per request (`USE_MOCK` wins if both are set and disagree, with a startup warning logged) and injects it into every page, so the browser always follows the same decision. `USE_MOCK=false` alone - a server restart, no rebuild - switches the whole app: the OAuth/data endpoints use the real `GoogleBusinessProfileProvider` and the UI calls them instead of the local mock. Pages are rendered dynamically (`force-dynamic`) for exactly this reason.

**Honesty note:** the real Google path is covered by unit tests against injected fixtures. It has not been run against a live Google Cloud project; that needs the OAuth consent screen and the Business Profile APIs enabled.

## Security notes

- Mock mode (the default) needs no keys or secrets. The real-mode Google variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are server-only, never prefixed `NEXT_PUBLIC_`, so they never ship to the browser.
- `.env*` files are git-ignored; only `.env.example` is committed.
- OAuth uses PKCE and a one-time, expiring state parameter; tokens are stored server-side (MongoDB, AES-256-GCM encrypted at rest, TTL-expired; in-memory fallback without MongoDB) keyed by an opaque HttpOnly session cookie and are never sent to the browser. Disconnect revokes the access token at Google and deletes the stored session.
- Post-OAuth redirects are restricted to same-site paths.
- In mock mode the Google consent flow is simulated: no real OAuth tokens, scopes or account data exist.

## Honesty notes

- The Google consent flow is a simulation: no real Google account, OAuth or data is involved. The screens say so in plain text.
- In default mock mode the “AI” chat and analysis are scripted mock content, presented as sample data in the UI. In live-backend mode without an LLM key, the analysis content comes from the deterministic template generator over the fixture review/photo data; the computed numbers are real computations over those records.

## Design docs

- `docs/design-plan.md`: the design plan written before coding (frontend-design skill process), with the generic-tells review.
- `docs/audit-web-design-guidelines.md`: the Web Interface Guidelines audit findings and fixes.
- `docs/audits.md`: accessibility and responsive pass results.
- `docs/qa-fixes.md`: independent QA findings (functional, security, design) and their verified resolutions.


## Chat refresh regression tests

- `npm run test:mongo`: spins up an ephemeral MongoDB (mongodb-memory-server, downloads a mongod binary; no credentials) and runs the MongoDB integration tests in `tests/vitest/mongoIntegration.test.ts`. The file self-skips without `MONGODB_URI`, so plain `npx vitest run` needs nothing extra.
- `npm test`: pure session validator and phase/last-assistant-message regressions, the mock-provider / Google-provider / OAuth-endpoint suite, plus the vitest suite (score math, LLM retry with a fake LLM, no-key fallback, reports API, rate limit, origin check, response contracts, session store + token crypto). All credential-free; the real provider is tested against injected fixtures, not live Google, and the LLM client against a fake transport, not a paid API. The MongoDB code path is verified against a real (ephemeral, credential-free) MongoDB via `npm run test:mongo`: Mongo-store selection, report save/list/get, AES-256-GCM ciphertext at rest, TTL indexes on both session collections, and the one-time OAuth state round trip. It has not been run against a long-lived production MongoDB.
- `npm run build` then `npm start -- -p 3107` in another terminal.
- `npm run test:refresh`: real Chromium refresh checks at 360 × 780, both normally and with all localStorage access denied. Install Chrome or Chromium first. Set `CHROME_PATH` if it is not `/opt/google/chrome/chrome`, and `TEST_BASE_URL` to test another deployment.
- `npm run test:e2e`: full flow - chat, consent, analysis, report, dashboard - against `TEST_BASE_URL`. Run it against a mock-mode server and a live-backend-mode (`NEXT_PUBLIC_API_BASE_URL=/api`) server to cover both modes.

Only validated in-progress intake conversations are stored in sessionStorage, never localStorage. The old v1 localStorage conversation is removed best-effort without restoring it. Each restore replays the transcript and compares all collected answers, question position and phase. Pending replies are not saved as completed turns. Start over cancels pending chat updates and asks before discarding an active conversation.

Consent refresh safely restarts the simulated account picker and keeps the intake. Analysis is not resumed from a saved transcript: refreshing during analysis starts a fresh conversation at step 2, without silently running analysis again. A completed report clears the conversation snapshot and stores only its report ID for the last-report card; the next conversation begins with the first question at step 2. A separate sessionStorage report cache keeps that report readable on refresh when localStorage is blocked. Saved dashboard history still uses the existing best-effort localStorage path. If sessionStorage itself is denied, conversations still work but cannot survive a full refresh.

## Vercel

See `docs/VERCEL.md`. Vercel needs `MONGODB_URI` and `TOKEN_ENCRYPTION_KEY`: the in-memory fallback is not durable on serverless. `/api/health` reports `durable`.
