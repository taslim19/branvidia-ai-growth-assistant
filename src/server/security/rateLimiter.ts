/**
 * Small in-memory sliding-window rate limiter for the chat and analysis
 * routes. Per process; good enough for the single-instance deployment, and
 * the limit is configurable with RATE_LIMIT_PER_MINUTE.
 */

const buckets = new Map<string, number[]>();

export function rateLimitPerMinute(env: Record<string, string | undefined> = process.env): number {
  const parsed = Number.parseInt(env.RATE_LIMIT_PER_MINUTE ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "local";
}

/** True when the request is allowed; false when the bucket is full. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
  now: number = Date.now(),
): boolean {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function rateLimitedResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Too many requests. Please wait a moment and try again.",
    }),
    { status: 429, headers: { "content-type": "application/json", "retry-after": "60" } },
  );
}

/** Test hook: clear all buckets. */
export function __resetRateLimiterForTests(): void {
  buckets.clear();
}
