import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ProviderLLM, getLLM } from "@/server/llm/llmClient";
import { POST as analysis } from "@/app/api/locations/[id]/analysis/route";
import { reportSchema } from "@/server/apiSchemas";
import { getReportStore } from "@/server/db/reportRepository";
import { buildAndSaveReport } from "@/server/analysis/reportBuilder";
import { __resetRateLimiterForTests } from "@/server/security/rateLimiter";

const schema = z.object({ value: z.string() });
const key = "fake-secret-never-log-me";
const config = { provider: "gemini", apiKey: key, model: "configured-flash-model", timeoutMs: 50 };
function reply(text = '{"value":"ok"}') {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Gemini server adapter", () => {
  it("requires an explicit LLM_MODEL, and rejects unsupported providers safely", () => {
    expect(getLLM({ LLM_PROVIDER: "gemini", LLM_API_KEY: key })).toBeNull();
    expect(getLLM({ LLM_PROVIDER: "unknown", LLM_API_KEY: key })).toBeNull();
  });

  it("uses configured model, header-only credentials, JSON MIME and zod validation", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply('{"wrong":1}')).mockResolvedValueOnce(reply());
    vi.stubGlobal("fetch", fetcher);
    const result = await new ProviderLLM(config).completeJSON("t", "system", "user", schema);
    expect(result).toEqual({ value: "ok" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toContain("/configured-flash-model:generateContent");
    expect(url).not.toContain(key);
    expect(options.headers["x-goog-api-key"]).toBe(key);
    const body = JSON.parse(options.body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.systemInstruction.parts[0].text).toBe("system");
    expect(options.body).not.toContain(key);
  });

  it("retries HTTP 429 twice with short exponential backoff, then succeeds", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(reply());
    vi.stubGlobal("fetch", fetcher);
    const start = Date.now();
    await expect(new ProviderLLM(config).completeJSON("t", "s", "u", schema)).resolves.toEqual({ value: "ok" });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(Date.now() - start).toBeGreaterThanOrEqual(700);
  });

  it("bounds combined invalid-JSON and transient attempts at three", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply("bad"))
      .mockResolvedValueOnce(new Response("busy", { status: 429 })).mockResolvedValueOnce(reply("bad"));
    vi.stubGlobal("fetch", fetcher);
    await expect(new ProviderLLM(config).completeJSON("t", "s", "u", schema)).rejects.toThrow("LLM did not return valid JSON");
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("does not retry authentication failures or return the provider body/key", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(key, { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(new ProviderLLM(config).completeJSON("t", "s", "u", schema)).rejects.toThrow(/^LLM request failed$/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("applies a fresh abort deadline to every timed-out attempt", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      signals.push(options.signal);
      options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    }));
    vi.stubGlobal("fetch", fetcher);
    await expect(new ProviderLLM({ ...config, timeoutMs: 5 }).completeJSON("t", "s", "u", schema))
      .rejects.toThrow(/^LLM request failed$/);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(new Set(signals).size).toBe(3);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it("labels a wholly successful LLM report llm and persists it", async () => {
    const template = await buildAndSaveReport({ locationId: "loc-indiranagar", tokens: null });
    vi.stubEnv("LLM_PROVIDER", "gemini"); vi.stubEnv("LLM_API_KEY", key);
    vi.stubEnv("LLM_MODEL", config.model);
    const outputs: Record<string, unknown> = {
      profileAudit: { problems: template.problems, suggestions: template.suggestions },
      reviewAnalysis: { reviewSentiments: [] },
      photoAnalysis: { contentIdeas: ["Test idea"] },
      synthesis: { problems: template.problems, suggestions: template.suggestions, nextSteps: template.nextSteps },
      reviewReplies: { drafts: template.replyDrafts },
    };
    vi.spyOn(ProviderLLM.prototype, "completeJSON").mockImplementation(async (task, _s, _u, taskSchema) => taskSchema.parse(outputs[task]));
    const report = await buildAndSaveReport({ locationId: "loc-indiranagar", tokens: null });
    expect(reportSchema.parse(report).source).toBe("llm");
    expect((await (await getReportStore()).get(report.id))?.source).toBe("llm");
  });

  for (const failure of ["429", "timeout"]) {
    it(`exhausted ${failure} returns a persisted template report without key/log leaks`, async () => {
      vi.stubEnv("LLM_PROVIDER", "gemini"); vi.stubEnv("LLM_API_KEY", key);
      vi.stubEnv("LLM_MODEL", config.model); vi.stubEnv("USE_MOCK", "true");
      const fetcher = failure === "429"
        ? vi.fn().mockImplementation(async () => new Response(key, { status: 429 }))
        : vi.fn().mockRejectedValue(new DOMException(key, "TimeoutError"));
      vi.stubGlobal("fetch", fetcher);
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      __resetRateLimiterForTests();
      const res = await analysis(new Request("http://localhost/api/locations/loc-indiranagar/analysis", {
        method: "POST", headers: { "content-type": "application/json" }, body: "{}",
      }), { params: { id: "loc-indiranagar" } });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(reportSchema.parse(body).source).toBe("template");
      expect((await (await getReportStore()).get(body.id))?.source).toBe("template");
      expect(fetcher).toHaveBeenCalledTimes(9); // 3 parallel passes, 3 attempts each
      expect(JSON.stringify(body)).not.toContain(key);
      expect(JSON.stringify([...log.mock.calls, ...warn.mock.calls, ...error.mock.calls])).not.toContain(key);
    });
  }
});
