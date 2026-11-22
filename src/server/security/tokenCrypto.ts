import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for OAuth tokens stored in MongoDB.
 * The key comes from TOKEN_ENCRYPTION_KEY: 64 hex chars or base64 for 32
 * bytes are used as-is; any other non-empty value is hashed with SHA-256
 * into a key. Tokens are never stored unencrypted: when MongoDB sessions are
 * configured without a key, the session store falls back to memory.
 */

const VERSION = "v1";

export function loadTokenKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const raw = env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32 && b64.toString("base64") === raw) return b64;
  // Any other non-empty value acts as a passphrase.
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptString(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptString(payload: string, key: Buffer): string {
  const [version, ivB64, tagB64, ctB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !ctB64) {
    throw new Error("Unrecognized ciphertext format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString(
    "utf8",
  );
}
