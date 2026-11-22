import { createHash, randomBytes } from "crypto";
import type { GoogleAccount } from "@/types";
import type { TokenSet } from "./providers/types";
import {
  getSessionStore,
  PENDING_TTL_MS,
  SESSION_TTL_MS,
  type StoredSession,
} from "./db/sessionRepository";

/**
 * Server-side Google session store facade.
 *
 * Tokens live only in the session store (MongoDB with AES-256-GCM encrypted
 * tokens and TTL indexes when MONGODB_URI + TOKEN_ENCRYPTION_KEY are set,
 * in-memory otherwise), keyed by an opaque id the browser holds in an
 * HttpOnly cookie. Cookie flags are configurable: SESSION_COOKIE_SECURE
 * ("true"/"false", default follows the request scheme) and
 * SESSION_COOKIE_SAMESITE ("Lax" default, "Strict", or "None" - which forces
 * Secure).
 */

export type GoogleSession = StoredSession;

export const SESSION_COOKIE = "branvidia_google_session";

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function newPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Register a one-time OAuth state with its PKCE verifier. */
export async function newOAuthState(verifier: string, returnTo: string | null): Promise<string> {
  const store = await getSessionStore();
  const state = base64url(randomBytes(16));
  await store.putState(state, { verifier, returnTo, createdAt: Date.now() });
  return state;
}

/** Consume a pending state (one-time use). Null when unknown or expired. */
export async function takeOAuthState(state: string) {
  const store = await getSessionStore();
  return store.takeState(state);
}

export async function createSession(
  account: GoogleAccount,
  tokens: TokenSet,
): Promise<GoogleSession> {
  const store = await getSessionStore();
  return store.createSession(account, tokens);
}

export async function getSession(id: string): Promise<GoogleSession | null> {
  const store = await getSessionStore();
  return store.getSession(id);
}

export async function destroySession(id: string): Promise<void> {
  const store = await getSessionStore();
  return store.destroySession(id);
}

/** Extract the session referenced by the request's cookie, if any. */
export async function readSessionFromRequest(request: Request): Promise<GoogleSession | null> {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      const id = decodeURIComponent(part.slice(eq + 1).trim());
      return getSession(id);
    }
  }
  return null;
}

const VALID_SAME_SITE = new Set(["Lax", "Strict", "None"]);

/** Build the Set-Cookie value; pass null id to clear the cookie. */
export function sessionCookieHeader(
  id: string | null,
  secure: boolean,
  env: Record<string, string | undefined> = process.env,
): string {
  const rawSameSite = env.SESSION_COOKIE_SAMESITE?.trim() ?? "";
  const sameSite = VALID_SAME_SITE.has(rawSameSite) ? rawSameSite : "Lax";
  const secureFlag =
    env.SESSION_COOKIE_SECURE !== undefined && env.SESSION_COOKIE_SECURE !== ""
      ? env.SESSION_COOKIE_SECURE === "true"
      : secure;
  // SameSite=None is only honored by browsers together with Secure.
  const effectiveSecure = secureFlag || sameSite === "None";
  const base = `${SESSION_COOKIE}=${id ?? ""}; Path=/; HttpOnly; SameSite=${sameSite}`;
  if (id === null) return `${base}; Max-Age=0${effectiveSecure ? "; Secure" : ""}`;
  return `${base}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${effectiveSecure ? "; Secure" : ""}`;
}

/** Only same-site paths are valid post-OAuth return targets. */
export function safeReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return null;
}

export { SESSION_TTL_MS, PENDING_TTL_MS };
