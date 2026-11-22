# Hosting on Vercel

The app is a standard Next.js 14 App Router project, so Vercel needs no custom
build: `vercel.json` only pins the framework and the `npm ci` / `npm run build`
commands. Chat, analysis, reports and health are route handlers under
`src/app/api/` and run as Vercel serverless functions.

## Required: MongoDB (do not rely on memory storage)

Without `MONGODB_URI` the app falls back to in-memory stores. On a long-running
server that only loses data on restart. On Vercel each function instance has its
own memory and instances are recycled at any time, so reports and OAuth
sessions would vanish or be missing between requests. Treat Vercel as
unsupported without a database.

Use a hosted MongoDB (for example MongoDB Atlas, or the Vercel Marketplace
integration) and set:

- `MONGODB_URI` and `MONGODB_DB=branvidia`
- `TOKEN_ENCRYPTION_KEY` (required for OAuth sessions to persist; generate a
  long random value)

Allow Vercel's outbound traffic in the database network rules (Atlas: allow
`0.0.0.0/0` or use a private-link/Marketplace integration, protected by a
strong database user).

The in-memory rate limiter (`RATE_LIMIT_PER_MINUTE`) is also per instance on
Vercel, so it is a soft limit there. Use Vercel Firewall rate limiting for a
hard cap.

`GET /api/health` reports `persistence`, `platform` and `durable`. Check that
`durable` is `true` after the first deploy.

## Environment variables (Project Settings > Environment Variables)

Server-only, never `NEXT_PUBLIC_*` for keys:

- `NEXT_PUBLIC_API_BASE_URL=/api` (set before the build; it is compiled in)
- `USE_MOCK` / `NEXT_PUBLIC_USE_MOCK` (`true` for the credential-free demo;
  `false` for the server-backed app: real Google sign-in + the data provider
  below)
- `GOOGLE_PROFILE_DATA` (`mock` default = hybrid mode: real sign-in, sample
  business data; `live` = real Business Profile APIs, which need Google's
  approved API access - the current project quota is 0, i.e. not approved)
- Real Google sign-in (`USE_MOCK=false`): `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_OAUTH_REDIRECT_URI=https://<your-domain>/api/oauth/google/callback`.
  Optional `GOOGLE_SCOPES` (default `openid email profile`). See the README
  section "Hybrid mode: real Google sign-in + sample data" for the full
  console setup guide.
- LLM: either Gemini (`LLM_PROVIDER=gemini`, `LLM_API_KEY`, `LLM_MODEL`,
  optional `LLM_TIMEOUT_MS`) or NVIDIA NIM (`LLM_PROVIDER=openai`,
  `LLM_BASE_URL=https://integrate.api.nvidia.com/v1`,
  `LLM_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b`, `LLM_API_KEY`,
  `LLM_CHAT_TEMPLATE_KWARGS={"enable_thinking": false}`,
  recommended `LLM_TIMEOUT_MS=30000`). Set at most one of
  `LLM_CHAT_TEMPLATE_KWARGS` and `LLM_REASONING_EFFORT`. After changing
  server variables, redeploy so they take effect.
- Optional: `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_MINUTE`

## Function duration

`/api/locations/[id]/analysis` declares `maxDuration = 200`. Vercel caps this by
plan, so lower it in `src/app/api/locations/[id]/analysis/route.ts` if your plan
allows less. With `LLM_TIMEOUT_MS=8000` and the template fallback the analysis
normally finishes far sooner; NVIDIA NIM runs use 30000, still bounded by the
route cap and the shared three-attempt retry budget.

## Deploy

1. Import the GitHub repo in Vercel (framework auto-detected as Next.js).
2. Add the variables above, then deploy.
3. Open `/api/health` and confirm `durable: true`.

Deploying is done in your own Vercel account; this repo only adds the support.
