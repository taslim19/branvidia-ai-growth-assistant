import { randomBytes } from "crypto";
import type { GoogleAccount } from "@/types";
import type { TokenSet } from "../providers/types";
import { getDb, mongoConfigured, warnMemoryFallback } from "./mongoClient";
import { decryptString, encryptString, loadTokenKey } from "../security/tokenCrypto";

/**
 * OAuth session and pending-state persistence.
 *
 * MongoDB when MONGODB_URI is set: sessions and one-time states live in
 * collections with TTL indexes (they expire themselves), and the token set
 * is AES-256-GCM encrypted at rest with TOKEN_ENCRYPTION_KEY. The browser
 * cookie only ever holds the opaque random session id.
 *
 * Without MONGODB_URI (or without TOKEN_ENCRYPTION_KEY while Mongo is
 * configured - tokens are never stored unencrypted) the store falls back to
 * in-memory with a startup warning, so the app still runs credential-free.
 */

export interface StoredSession {
  id: string;
  account: GoogleAccount;
  tokens: TokenSet;
  createdAt: number;
}

export interface StoredState {
  verifier: string;
  returnTo: string | null;
  createdAt: number;
}

export interface SessionStore {
  readonly kind: "mongo" | "memory";
  createSession(account: GoogleAccount, tokens: TokenSet): Promise<StoredSession>;
  getSession(id: string): Promise<StoredSession | null>;
  destroySession(id: string): Promise<void>;
  putState(state: string, pending: StoredState): Promise<void>;
  takeState(state: string): Promise<StoredState | null>;
}

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const PENDING_TTL_MS = 10 * 60 * 1000;

function newId(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

export class MemorySessionStore implements SessionStore {
  readonly kind = "memory" as const;
  private readonly sessions = new Map<string, StoredSession>();
  private readonly pendingStates = new Map<string, StoredState>();

  private sweep(): void {
    const now = Date.now();
    this.sessions.forEach((s, id) => {
      if (now - s.createdAt > SESSION_TTL_MS) this.sessions.delete(id);
    });
    this.pendingStates.forEach((p, state) => {
      if (now - p.createdAt > PENDING_TTL_MS) this.pendingStates.delete(state);
    });
  }

  async createSession(account: GoogleAccount, tokens: TokenSet): Promise<StoredSession> {
    this.sweep();
    const session: StoredSession = { id: newId(24), account, tokens, createdAt: Date.now() };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<StoredSession | null> {
    this.sweep();
    return this.sessions.get(id) ?? null;
  }

  async destroySession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async putState(state: string, pending: StoredState): Promise<void> {
    this.sweep();
    this.pendingStates.set(state, pending);
  }

  async takeState(state: string): Promise<StoredState | null> {
    this.sweep();
    const pending = this.pendingStates.get(state) ?? null;
    if (pending) this.pendingStates.delete(state);
    return pending;
  }
}

export class MongoSessionStore implements SessionStore {
  readonly kind = "mongo" as const;
  private indexesReady: Promise<void> | null = null;

  constructor(private readonly key: Buffer) {}

  private async sessionsCol() {
    const db = await getDb();
    if (!db) throw new Error("MongoDB is not configured.");
    return db.collection<any>("oauth_sessions");
  }

  private async statesCol() {
    const db = await getDb();
    if (!db) throw new Error("MongoDB is not configured.");
    return db.collection<any>("oauth_states");
  }

  /** TTL indexes do the expiry work; created once per process. */
  private async ensureIndexes(): Promise<void> {
    if (!this.indexesReady) {
      this.indexesReady = (async () => {
        const sessions = await this.sessionsCol();
        const states = await this.statesCol();
        await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await states.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      })();
      this.indexesReady.catch(() => {
        this.indexesReady = null;
      });
    }
    return this.indexesReady;
  }

  async createSession(account: GoogleAccount, tokens: TokenSet): Promise<StoredSession> {
    await this.ensureIndexes();
    const col = await this.sessionsCol();
    const session: StoredSession = { id: newId(24), account, tokens, createdAt: Date.now() };
    await col.insertOne({
      _id: session.id,
      account,
      encTokens: encryptString(JSON.stringify(tokens), this.key),
      createdAt: session.createdAt,
      expiresAt: new Date(session.createdAt + SESSION_TTL_MS),
    });
    return session;
  }

  async getSession(id: string): Promise<StoredSession | null> {
    await this.ensureIndexes();
    const col = await this.sessionsCol();
    const row = await col.findOne({ _id: id });
    if (!row) return null;
    const tokens = JSON.parse(decryptString(String(row.encTokens), this.key)) as TokenSet;
    return {
      id: String(row._id),
      account: row.account as GoogleAccount,
      tokens,
      createdAt: Number(row.createdAt),
    };
  }

  async destroySession(id: string): Promise<void> {
    await this.ensureIndexes();
    const col = await this.sessionsCol();
    await col.deleteOne({ _id: id });
  }

  async putState(state: string, pending: StoredState): Promise<void> {
    await this.ensureIndexes();
    const col = await this.statesCol();
    await col.insertOne({
      _id: state,
      verifier: pending.verifier,
      returnTo: pending.returnTo,
      createdAt: pending.createdAt,
      expiresAt: new Date(pending.createdAt + PENDING_TTL_MS),
    });
  }

  async takeState(state: string): Promise<StoredState | null> {
    await this.ensureIndexes();
    const col = await this.statesCol();
    const row = await col.findOneAndDelete({ _id: state });
    if (!row) return null;
    if (Date.now() - Number(row.createdAt) > PENDING_TTL_MS) return null;
    return {
      verifier: String(row.verifier),
      returnTo: (row.returnTo as string | null) ?? null,
      createdAt: Number(row.createdAt),
    };
  }
}

let cached: SessionStore | null = null;

export async function getSessionStore(): Promise<SessionStore> {
  if (cached) return cached;
  if (mongoConfigured()) {
    const key = loadTokenKey();
    if (!key) {
      console.warn(
        "[branvidia] MONGODB_URI is set but TOKEN_ENCRYPTION_KEY is missing; OAuth " +
          "sessions fall back to the in-memory store because tokens are never stored " +
          "unencrypted. Set TOKEN_ENCRYPTION_KEY (32 bytes, hex or base64) to persist them.",
      );
    } else {
      try {
        const db = await getDb();
        if (db) {
          cached = new MongoSessionStore(key);
          return cached;
        }
      } catch (err) {
        console.warn(
          `[branvidia] MongoDB is configured but unreachable (${(err as Error).message}); ` +
            "OAuth sessions fall back to the in-memory store for this process.",
        );
      }
    }
  } else {
    warnMemoryFallback("OAuth sessions");
  }
  cached = new MemorySessionStore();
  return cached;
}

/** Test hook: drop the cached store. */
export function __resetSessionStoreForTests(): void {
  cached = null;
}
