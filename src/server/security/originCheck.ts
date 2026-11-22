/**
 * Origin check for state-changing routes. Browser POST/PUT/PATCH/DELETE
 * requests must come from the app's own origin (or an origin on the
 * ALLOWED_ORIGINS allowlist). Requests without an Origin header - curl,
 * server-to-server, tests - are allowed, matching standard SameSite=Lax
 * cookie behavior.
 */

export function isAllowedOrigin(request: Request, env: Record<string, string | undefined> = process.env): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  let requestHost: string;
  try {
    originHost = new URL(origin).host;
    requestHost = new URL(request.url).host;
  } catch {
    return false;
  }
  if (originHost === requestHost) return true;
  const allowlist = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(origin);
}

export function originDeniedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "forbidden_origin",
      message: "This request's origin is not allowed.",
    }),
    { status: 403, headers: { "content-type": "application/json" } },
  );
}
