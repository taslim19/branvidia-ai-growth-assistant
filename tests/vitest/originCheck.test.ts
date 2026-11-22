import { beforeEach, describe, expect, it } from "vitest";
import { isAllowedOrigin } from "@/server/security/originCheck";
import { __resetRateLimiterForTests } from "@/server/security/rateLimiter";
import { POST as chatMessage } from "@/app/api/chat/message/route";

beforeEach(() => {
  __resetRateLimiterForTests();
  delete process.env.ALLOWED_ORIGINS;
});

const VALID_BODY = JSON.stringify({
  state: { questionIndex: 0, phase: "asking", info: {} },
  input: "Brew & Bean Café",
});

describe("origin check", () => {
  it("same-origin, no-origin and allowlisted origins pass", () => {
    expect(
      isAllowedOrigin(
        new Request("https://app.example/api/x", { headers: { origin: "https://app.example" } }),
      ),
    ).toBe(true);
    expect(isAllowedOrigin(new Request("https://app.example/api/x"))).toBe(true);
    expect(
      isAllowedOrigin(
        new Request("https://app.example/api/x", { headers: { origin: "https://admin.example" } }),
        { ALLOWED_ORIGINS: "https://admin.example" },
      ),
    ).toBe(true);
  });

  it("foreign origins are denied", () => {
    expect(
      isAllowedOrigin(
        new Request("https://app.example/api/x", { headers: { origin: "https://evil.example" } }),
      ),
    ).toBe(false);
    expect(
      isAllowedOrigin(new Request("https://app.example/api/x", { headers: { origin: "not a url" } })),
    ).toBe(false);
  });

  it("POST /api/chat/message enforces the check", async () => {
    const res = await chatMessage(
      new Request("http://localhost/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: VALID_BODY,
      }),
    );
    expect(res.status).toBe(403);

    const ok = await chatMessage(
      new Request("http://localhost/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost" },
        body: VALID_BODY,
      }),
    );
    expect(ok.status).toBe(200);
  });
});
