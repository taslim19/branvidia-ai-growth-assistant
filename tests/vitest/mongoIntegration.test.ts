import { describe, expect, it } from "vitest";
import { MongoClient } from "mongodb";

/**
 * Integration test against a real MongoDB (ephemeral mongod from
 * mongodb-memory-server, started by scripts/run-mongo-it.cjs). Skipped unless
 * MONGODB_URI is set, so the default `npx vitest run` suite needs no Mongo.
 */

const URI = process.env.MONGODB_URI;
const run = URI ? describe : describe.skip;

const TOKENS = {
  accessToken: "ya29.integration-secret-access-token",
  refreshToken: "1//integration-secret-refresh-token",
  expiresAt: Date.now() + 3600_000,
  scope: "https://www.googleapis.com/auth/business.manage",
  tokenType: "Bearer",
};

const ACCOUNT = { id: "acct-it", name: "Integration Test", email: "it@example.com" };

run("MongoDB persistence (ephemeral server)", () => {
  it("uses the Mongo stores when MONGODB_URI is set", async () => {
    const { getReportStore } = await import("@/server/db/reportRepository");
    const { getSessionStore } = await import("@/server/db/sessionRepository");
    expect((await getReportStore()).kind).toBe("mongo");
    expect((await getSessionStore()).kind).toBe("mongo");
  });

  it("saves, lists and reads reports through the official driver", async () => {
    const { getReportStore } = await import("@/server/db/reportRepository");
    const store = await getReportStore();
    const report = {
      id: "rpt-it-1",
      businessName: "Integration Cafe",
      score: 49,
      createdAt: new Date().toISOString(),
      breakdown: { profile: 44, reviews: 69, photos: 33, engagement: 42 },
    } as never;
    await store.save(report);
    const summaries = await store.list();
    expect(summaries.some((r) => r.id === "rpt-it-1")).toBe(true);
    expect(summaries.find((r) => r.id === "rpt-it-1")).toMatchObject({
      businessName: "Integration Cafe",
      score: 49,
    });
    const loaded = await store.get("rpt-it-1");
    expect(loaded?.score).toBe(49);
    expect(loaded?.breakdown.reviews).toBe(69);
    expect(await store.get("rpt-does-not-exist")).toBeNull();
  });

  it("stores OAuth tokens AES-256-GCM encrypted, never in plaintext", async () => {
    const { getSessionStore } = await import("@/server/db/sessionRepository");
    const store = await getSessionStore();
    const session = await store.createSession(ACCOUNT, TOKENS);

    // Round trip through the store decrypts transparently.
    const loaded = await store.getSession(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.tokens).toEqual(TOKENS);
    expect(loaded!.account).toEqual(ACCOUNT);

    // The raw document holds ciphertext only.
    const client = new MongoClient(URI!);
    await client.connect();
    try {
      const raw = await client.db("branvidia").collection<any>("oauth_sessions").findOne({ _id: session.id });
      expect(raw).not.toBeNull();
      expect(raw!.tokens).toBeUndefined();
      expect(typeof raw!.encTokens).toBe("string");
      expect(raw!.encTokens).not.toContain("integration-secret");
      expect(raw!.expiresAt).toBeInstanceOf(Date);

      // TTL indexes expire sessions and pending OAuth states automatically.
      const sessionIndexes = await client.db("branvidia").collection<any>("oauth_sessions").listIndexes().toArray();
      const stateIndexes = await client.db("branvidia").collection<any>("oauth_states").listIndexes().toArray();
      for (const indexes of [sessionIndexes, stateIndexes]) {
        const ttl = indexes.find((i) => i.key && i.key.expiresAt === 1);
        expect(ttl, "expiresAt TTL index").toBeTruthy();
        expect(ttl!.expireAfterSeconds).toBe(0);
      }
    } finally {
      await client.close();
    }

    await store.destroySession(session.id);
    expect(await store.getSession(session.id)).toBeNull();
  });

  it("round-trips pending OAuth state exactly once", async () => {
    const { getSessionStore } = await import("@/server/db/sessionRepository");
    const store = await getSessionStore();
    await store.putState("state-it-1", {
      verifier: "verifier-secret",
      returnTo: "/assistant",
      createdAt: Date.now(),
    });
    const taken = await store.takeState("state-it-1");
    expect(taken).toMatchObject({ verifier: "verifier-secret", returnTo: "/assistant" });
    expect(await store.takeState("state-it-1")).toBeNull();
  });
});
