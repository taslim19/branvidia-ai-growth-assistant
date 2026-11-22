import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ProviderLLM, LlmError, extractJson, llmConfigFromEnv } from "@/server/llm/llmClient";

const schema = z.object({ value: z.string() });

function fakeConfig(): ConstructorParameters<typeof ProviderLLM>[0] {
  return { provider: "openai", apiKey: "test-key", model: "test-model", timeoutMs: 5000 };
}

describe("llmClient retry", () => {
  it("retries exactly once on invalid JSON and then succeeds", async () => {
    const replies = ["not json at all", '{"value": "second try"}'];
    const seen: string[] = [];
    const llm = new ProviderLLM(fakeConfig(), async (_system, user) => {
      seen.push(user);
      return replies.shift() as string;
    });
    const result = await llm.completeJSON("test", "system", "user prompt", schema);
    expect(result.value).toBe("second try");
    expect(seen).toHaveLength(2);
    // The retry carries the validation problem back to the model.
    expect(seen[1]).toContain("previous reply was not valid");
  });

  it("retries on schema mismatch, not just parse errors", async () => {
    const replies = ['{"wrong": 1}', '```json\n{"value": "fixed"}\n```'];
    const llm = new ProviderLLM(fakeConfig(), async () => replies.shift() as string);
    const result = await llm.completeJSON("test", "s", "u", schema);
    expect(result.value).toBe("fixed");
  });

  it("throws LlmError after the one retry is exhausted", async () => {
    const llm = new ProviderLLM(fakeConfig(), async () => "still not json");
    await expect(llm.completeJSON("test", "s", "u", schema)).rejects.toThrow(LlmError);
  });

  it("extractJson pulls the object out of code fences and prose", () => {
    expect(extractJson('Here you go: {"a": 1} done')).toBe('{"a": 1}');
    expect(extractJson('```json\n{"b": 2}\n```')).toBe('{"b": 2}');
    expect(() => extractJson("no object")).toThrow();
  });

  it("no API key means no client (template generator takes over)", () => {
    expect(llmConfigFromEnv({})).toBeNull();
    expect(llmConfigFromEnv({ LLM_API_KEY: "k" })?.provider).toBe("openai");
    expect(llmConfigFromEnv({ LLM_API_KEY: "k", LLM_PROVIDER: "anthropic" })?.model).toContain("claude");
  });
});
