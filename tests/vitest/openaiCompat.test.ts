import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ProviderLLM, llmConfigFromEnv } from "@/server/llm/llmClient";

const schema = z.object({ value: z.string() });
const key = "fake-secret-never-log-me";
const config = {
  provider: "openai",
  apiKey: key,
  model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  timeoutMs: 5000,
};

function reply(text = '{"value":"ok"}') {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: text } }] }),
    { status: 200 },
  );
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("OpenAI-compatible adapter (NVIDIA NIM)", () => {
  it("parses LLM_REASONING_EFFORT from env, empty means unset", () => {
    expect(llmConfigFromEnv({ LLM_API_KEY: key, LLM_REASONING_EFFORT: "none" })?.reasoningEffort).toBe("none");
    expect(llmConfigFromEnv({ LLM_API_KEY: key })?.reasoningEffort).toBeUndefined();
    expect(llmConfigFromEnv({ LLM_API_KEY: key, LLM_REASONING_EFFORT: "  " })?.reasoningEffort).toBeUndefined();
  });

  it("sends reasoning_effort only when configured, keeps JSON mode and base URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply());
    vi.stubGlobal("fetch", fetcher);
    await new ProviderLLM({ ...config, reasoningEffort: "none" }).completeJSON("t", "system", "user", schema);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(options.headers.authorization).toBe(`Bearer ${key}`);
    const body = JSON.parse(options.body);
    expect(body.model).toBe("nvidia/nemotron-3.5-super-vl-120b-a12b");
    expect(body.reasoning_effort).toBe("none");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages).toEqual([
      { role: "system", content: "system" },
      { role: "user", content: "user" },
    ]);
  });

  it("omits reasoning_effort when not configured", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply());
    vi.stubGlobal("fetch", fetcher);
    await new ProviderLLM(config).completeJSON("t", "s", "u", schema);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect("reasoning_effort" in body).toBe(false);
    expect("chat_template_kwargs" in body).toBe(false);
  });

  it("sends chat_template_kwargs verbatim from env JSON (NVIDIA non-thinking contract)", async () => {
    const parsed = llmConfigFromEnv({
      LLM_API_KEY: key,
      LLM_CHAT_TEMPLATE_KWARGS: '{"enable_thinking": false}',
    });
    expect(parsed?.chatTemplateKwargs).toEqual({ enable_thinking: false });
    const fetcher = vi.fn().mockResolvedValue(reply());
    vi.stubGlobal("fetch", fetcher);
    await new ProviderLLM({ ...config, ...parsed }).completeJSON("t", "s", "u", schema);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect("reasoning_effort" in body).toBe(false);
  });

  it("fails closed on malformed LLM_CHAT_TEMPLATE_KWARGS", () => {
    expect(llmConfigFromEnv({ LLM_API_KEY: key, LLM_CHAT_TEMPLATE_KWARGS: "not json" })).toBeNull();
    expect(llmConfigFromEnv({ LLM_API_KEY: key, LLM_CHAT_TEMPLATE_KWARGS: "[1,2]" })).toBeNull();
    expect(llmConfigFromEnv({ LLM_API_KEY: key, LLM_CHAT_TEMPLATE_KWARGS: '"str"' })).toBeNull();
  });

  it("feeds schema issue paths back on the correction retry (NVIDIA nextSteps shape)", async () => {
    // Live NVIDIA replies used {"step": "..."} entries missing title/detail.
    const wrong = JSON.stringify({
      problems: [], suggestions: [],
      nextSteps: [{ step: "Do the thing", timeframe: "Today" }],
    });
    const fixed = JSON.stringify({
      problems: [], suggestions: [],
      nextSteps: [{ title: "Do the thing", detail: "Because reasons", timeframe: "Today" }],
    });
    const synthSchema = z.object({
      problems: z.array(z.unknown()),
      suggestions: z.array(z.unknown()),
      nextSteps: z.array(z.object({
        title: z.string().min(1),
        detail: z.string().min(1),
        timeframe: z.string().min(1),
      })),
    });
    const seen: string[] = [];
    const llm = new ProviderLLM(config, async (_s, user) => {
      seen.push(user);
      return seen.length === 1 ? wrong : fixed;
    });
    const result = await llm.completeJSON("synthesis", "s", "u", synthSchema);
    expect(result.nextSteps[0].title).toBe("Do the thing");
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain("nextSteps.0.title");
    expect(seen[1]).toContain("nextSteps.0.detail");
  });

  it("retries transient 502/503/504 within the shared attempt cap", async () => {
    for (const status of [502, 503, 504]) {
      const fetcher = vi.fn()
        .mockResolvedValueOnce(new Response("upstream", { status }))
        .mockResolvedValueOnce(reply());
      vi.stubGlobal("fetch", fetcher);
      await expect(new ProviderLLM(config).completeJSON("t", "s", "u", schema)).resolves.toEqual({ value: "ok" });
      expect(fetcher).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    }
  });

  it("bounds repeated 503s at three attempts and reports http_server_error", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("upstream", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    await new ProviderLLM(config).completeJSON("t", "s", "u", schema).catch((err) => {
      expect(err.message).toBe("LLM request failed");
      expect(err.category).toBe("http_server_error");
      expect(err.httpStatus).toBe(503);
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not retry other 5xx or 4xx statuses", async () => {
    for (const status of [500, 400, 401]) {
      const fetcher = vi.fn().mockResolvedValue(new Response("nope", { status }));
      vi.stubGlobal("fetch", fetcher);
      await expect(new ProviderLLM(config).completeJSON("t", "s", "u", schema)).rejects.toThrow("LLM request failed");
      expect(fetcher).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    }
  });
});
