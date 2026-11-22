import { MongoClient, type Db } from "mongodb";

/**
 * Shared MongoDB connection (official driver). Lazy singleton: nothing
 * connects until a repository asks for the database. When MONGODB_URI is
 * unset the app keeps working on in-memory stores, with a one-time startup
 * warning, so the whole app still runs credential-free.
 */

let clientPromise: Promise<MongoClient> | null = null;
let fallbackWarned = false;

export function mongoConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.MONGODB_URI && env.MONGODB_URI.trim());
}

export function warnMemoryFallback(feature: string, env: Record<string, string | undefined> = process.env): void {
  if (mongoConfigured(env)) return;
  if (fallbackWarned) return;
  fallbackWarned = true;
  console.warn(
    `[branvidia] MONGODB_URI is not set: ${feature} use the in-memory store and are lost ` +
      "on restart. Set MONGODB_URI (and MONGODB_DB, default branvidia) to persist them. " +
      "Set TOKEN_ENCRYPTION_KEY as well so OAuth tokens are encrypted at rest.",
  );
}

/** Null when MongoDB is not configured; throws when configured but unreachable. */
export async function getDb(env: Record<string, string | undefined> = process.env): Promise<Db | null> {
  if (!mongoConfigured(env)) return null;
  if (!clientPromise) {
    const client = new MongoClient(env.MONGODB_URI as string, {
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect();
    // A failed connect clears the cached promise so the next call retries.
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  const client = await clientPromise;
  return client.db(env.MONGODB_DB?.trim() || "branvidia");
}

/** Test hook: drop the cached connection promise. */
export function __resetMongoClientForTests(): void {
  clientPromise = null;
  fallbackWarned = false;
}
