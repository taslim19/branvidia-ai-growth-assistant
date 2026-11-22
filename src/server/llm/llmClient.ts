// Runtime guard plus Node-only imports keep this module on the server.
if (typeof window !== "undefined") throw new Error("LLM client is server-only");
import { readFileSync } from "fs";
import path from "path";
import { z } from "zod";

/**
 * Provider-agnostic LLM client. Selected entirely by env:
 *   LLM_PROVIDER   "openai" (default), "anthropic" or "gemini"
 *   LLM_API_KEY    required; without it getLLM() returns null and the
 *                  deterministic template generator runs instead
 *   LLM_MODEL      required for Gemini; defaults for older adapters below
 *   LLM_BASE_URL   optional override for OpenAI-compatible endpoints
 *   LLM_TIMEOUT_MS request timeout (default 30000)
 *
 * Structured output: the model is asked for a JSON object, the reply is
 * parsed and validated with zod, and invalid JSON gets exactly one retry
 * with a safe correction prompt. Transient retries share a three-attempt cap. Server-side only - never import this
 * from client components.
 */

export interface LlmClient {
  readonly provider: string;
  completeJSON<T>(task: string, system: string, user: string, schema: z.ZodType<T>): Promise<T>;
}

export type LlmErrorCategory =
  | "timeout"
  | "rate_limited"
  | "http_client_error"
  | "http_server_error"
  | "empty_reply"
  | "invalid_json"
  | "unknown";

export class LlmError extends Error {
  readonly code = "llm_error" as const;
  constructor(
    message: string,
    readonly retryable = false,
    readonly category: LlmErrorCategory = "unknown",
    readonly httpStatus?: number,
    readonly task?: string,
  ) { super(message); }
}

export interface ProviderConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs: number;
}

export function llmConfigFromEnv(env: Record<string, string | undefined> = process.env): ProviderConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  const provider = (env.LLM_PROVIDER?.trim() || "openai").toLowerCase();
  if (!["openai", "anthropic", "gemini"].includes(provider)) return null;
  // Fail closed to templates when Gemini has no explicit model selection.
  if (provider === "gemini" && !env.LLM_MODEL?.trim()) return null;
  const defaultModel = provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4o-mini";
  const timeoutMs = Number.parseInt(env.LLM_TIMEOUT_MS ?? "", 10);
  return {
    provider,
    apiKey,
    model: env.LLM_MODEL?.trim() || defaultModel,
    baseUrl: env.LLM_BASE_URL?.trim() || undefined,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30_000,
  };
}

/** Prompt markdown files live in src/server/prompts/. */
const promptCache = new Map<string, string>();

export function loadPrompt(name: string): string {
  let text = promptCache.get(name);
  if (!text) {
    text = readFileSync(path.join(process.cwd(), "src/server/prompts", name), "utf8");
    promptCache.set(name, text);
  }
  return text;
}

export function renderPrompt(name: string, vars: Record<string, string>): string {
  let text = loadPrompt(name);
  for (const [key, value] of Object.entries(vars)) {
    text = text.split(`{{${key}}}`).join(value);
  }
  return text;
}

/** Pull the first JSON object out of a model reply (code fences tolerated). */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return candidate.slice(start, end + 1);
}

type Transport = (system: string, user: string) => Promise<string>;

export class ProviderLLM implements LlmClient {
  /** transport overrides the HTTP call - used by tests with a fake LLM. */
  constructor(
    private readonly config: ProviderConfig,
    private readonly transport?: Transport,
  ) {}

  get provider(): string {
    return this.config.provider;
  }

  private async call(system: string, user: string): Promise<string> {
    if (this.transport) return this.transport(system, user);
    const { provider, apiKey, model, baseUrl, timeoutMs } = this.config;
    const signal = AbortSignal.timeout(timeoutMs);
    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST", signal,
          headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      );
      if (!res.ok) throw new LlmError(`gemini HTTP ${res.status}`, res.status === 429, res.status === 429 ? "rate_limited" : res.status < 500 ? "http_client_error" : "http_server_error", res.status);
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts
        ?.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      if (!text) throw new LlmError("gemini reply had no text", false, "empty_reply");
      return text;
    }
    if (provider === "anthropic") {
      const res = await fetch(`${baseUrl ?? "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) throw new LlmError(`anthropic HTTP ${res.status}`, res.status === 429, res.status === 429 ? "rate_limited" : res.status < 500 ? "http_client_error" : "http_server_error", res.status);
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = data.content?.find((b) => b.type === "text")?.text;
      if (!text) throw new LlmError("anthropic reply had no text block", false, "empty_reply");
      return text;
    }
    // OpenAI-compatible chat completions.
    const res = await fetch(`${baseUrl ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new LlmError(`openai HTTP ${res.status}`, res.status === 429, res.status === 429 ? "rate_limited" : res.status < 500 ? "http_client_error" : "http_server_error", res.status);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new LlmError("openai reply had no content", false, "empty_reply");
    return text;
  }

  async completeJSON<T>(
    task: string,
    system: string,
    user: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    // One shared budget: at most 3 HTTP attempts, never nested retry loops.
    // Invalid JSON/schema gets one correction; 429/timeouts get up to two
    // retries with 250ms, 500ms backoff, constrained by that shared budget.
    let invalidReplies = 0;
    let transientRetries = 0;
    let prompt = user;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let raw: string;
      try {
        raw = await this.call(system, prompt);
      } catch (err) {
        const timeout = err instanceof Error &&
          ["TimeoutError", "AbortError"].includes(err.name);
        const retryable = timeout || (err instanceof LlmError && err.retryable);
        if (retryable && transientRetries < 2 && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** transientRetries));
          transientRetries += 1;
          continue;
        }
        // Never expose provider bodies, raw errors, prompts or credentials -
        // but keep a sanitized category and HTTP status for ops logs.
        const category = timeout ? "timeout"
          : err instanceof LlmError ? err.category
          : "unknown";
        const httpStatus = err instanceof LlmError ? err.httpStatus : undefined;
        throw new LlmError("LLM request failed", false, category, httpStatus, task);
      }
      try {
        const parsed: unknown = JSON.parse(extractJson(raw));
        const result = schema.safeParse(parsed);
        if (result.success) return result.data;
      } catch { /* Parse failures use the same single correction below. */ }
      invalidReplies += 1;
      if (invalidReplies > 1 || attempt === 2) break;
      prompt = `${user}\n\nYour previous reply was not valid: JSON/schema validation failed. ` +
        "Reply with only the corrected JSON object matching the requested schema, no commentary.";
    }
    throw new LlmError("LLM did not return valid JSON after one correction retry", false, "invalid_json", undefined, task);
  }
}

/** Null when LLM_API_KEY is not set - callers then use templateGenerator. */
export function getLLM(env: Record<string, string | undefined> = process.env): LlmClient | null {
  const config = llmConfigFromEnv(env);
  return config ? new ProviderLLM(config) : null;
}
