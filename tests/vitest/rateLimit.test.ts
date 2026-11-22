import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetRateLimiterForTests,
  checkRateLimit,
  rateLimitPerMinute,
} from "@/server/security/rateLimiter";
import { GET as chatOpening } from "@/app/api/chat/opening/route";

beforeEach(() => {
  __resetRateLimiterForTests();
  delete process.env.RATE_LIMIT_PER_MINUTE;
});

describe("rate limiter", () => {
  it("allows up to the limit, then blocks within the window", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit("k", 5, 60_000, now)).toBe(true);
    }
    expect(checkRateLimit("k", 5, 60_000, now)).toBe(false);
    // After the window slides, requests pass again.
    expect(checkRateLimit("k", 5, 60_000, now + 61_000)).toBe(true);
  });

  it("separate keys are independent", () => {
    const now = Date.now();
    expect(checkRateLimit("a", 1, 60_000, now)).toBe(true);
    expect(checkRateLimit("b", 1, 60_000, now)).toBe(true);
    expect(checkRateLimit("a", 1, 60_000, now)).toBe(false);
  });

  it("default limit is 30/min; env overrides", () => {
    expect(rateLimitPerMinute({})).toBe(30);
    expect(rateLimitPerMinute({ RATE_LIMIT_PER_MINUTE: "5" })).toBe(5);
    expect(rateLimitPerMinute({ RATE_LIMIT_PER_MINUTE: "junk" })).toBe(30);
  });

  it("GET /api/chat/opening returns 429 once the bucket is full", async () => {
    process.env.RATE_LIMIT_PER_MINUTE = "2";
    const req = () => new Request("http://localhost/api/chat/opening");
    expect((await chatOpening(req())).status).toBe(200);
    expect((await chatOpening(req())).status).toBe(200);
    const third = await chatOpening(req());
    expect(third.status).toBe(429);
    expect(third.headers.get("retry-after")).toBe("60");
  });
});
