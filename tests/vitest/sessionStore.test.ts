import { describe, expect, it } from "vitest";
import { MemorySessionStore } from "@/server/db/sessionRepository";
import { decryptString, encryptString, loadTokenKey } from "@/server/security/tokenCrypto";
import { sessionCookieHeader } from "@/server/oauthSessions";

const account = { id: "ga-1", name: "Priya Ramesh", email: "priya@example.com" };
const tokens = {
  accessToken: "ya29.fake-access",
  refreshToken: "fake-refresh",
  expiresAt: Date.now() + 3600_000,
  scope: "business.manage",
  tokenType: "Bearer",
};

describe("token crypto", () => {
  it("encrypts and decrypts with AES-256-GCM; ciphertext hides the token", () => {
    const key = loadTokenKey({ TOKEN_ENCRYPTION_KEY: "test-passphrase" });
    expect(key).not.toBeNull();
    const enc = encryptString(JSON.stringify(tokens), key!);
    expect(enc).not.toContain("ya29");
    expect(JSON.parse(decryptString(enc, key!))).toMatchObject({ accessToken: "ya29.fake-access" });
  });

  it("accepts hex and base64 keys; empty means no key", () => {
    expect(loadTokenKey({})).toBeNull();
    expect(loadTokenKey({ TOKEN_ENCRYPTION_KEY: "ab".repeat(32) })?.length).toBe(32);
    expect(loadTokenKey({ TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") })?.length).toBe(32);
  });

  it("tampered ciphertext fails decryption", () => {
    const key = loadTokenKey({ TOKEN_ENCRYPTION_KEY: "k" })!;
    const enc = encryptString("secret", key);
    const [v, iv, tag, ct] = enc.split(".");
    expect(() => decryptString([v, iv, tag, ct.slice(0, -2) + "xx"].join("."), key)).toThrow();
  });
});

describe("session store (memory fallback)", () => {
  it("session lifecycle: create, read, destroy", async () => {
    const store = new MemorySessionStore();
    const session = await store.createSession(account, tokens);
    expect((await store.getSession(session.id))?.tokens.accessToken).toBe("ya29.fake-access");
    await store.destroySession(session.id);
    expect(await store.getSession(session.id)).toBeNull();
  });

  it("pending states are one-time", async () => {
    const store = new MemorySessionStore();
    await store.putState("st", { verifier: "v", returnTo: "/x", createdAt: Date.now() });
    expect((await store.takeState("st"))?.verifier).toBe("v");
    expect(await store.takeState("st")).toBeNull();
  });
});

describe("cookie flags from env", () => {
  it("defaults follow the request scheme, SameSite=Lax", () => {
    expect(sessionCookieHeader("id1", true, {})).toBe(
      "branvidia_google_session=id1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400; Secure",
    );
    expect(sessionCookieHeader("id1", false, {})).not.toContain("Secure");
  });

  it("env overrides win; SameSite=None forces Secure; clearing works", () => {
    expect(sessionCookieHeader("id1", false, { SESSION_COOKIE_SECURE: "true" })).toContain("; Secure");
    expect(sessionCookieHeader("id1", true, { SESSION_COOKIE_SAMESITE: "Strict" })).toContain("SameSite=Strict");
    expect(sessionCookieHeader("id1", false, { SESSION_COOKIE_SAMESITE: "None" })).toContain("; Secure");
    expect(sessionCookieHeader(null, true, {})).toContain("Max-Age=0");
  });
});
