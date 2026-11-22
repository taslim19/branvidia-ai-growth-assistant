import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { GET as chatOpening } from "@/app/api/chat/opening/route";
import { POST as chatMessage } from "@/app/api/chat/message/route";
import { POST as skipOptIn } from "@/app/api/chat/skip-opt-in/route";
import { GET as chatCancelled } from "@/app/api/chat/cancelled/route";
import { GET as health } from "@/app/api/health/route";
import { chatTurnResultSchema } from "@/server/apiSchemas";
import { __resetRateLimiterForTests } from "@/server/security/rateLimiter";
import { initialChatState, type ChatSessionState } from "@/lib/chatFlow";

beforeEach(() => {
  __resetRateLimiterForTests();
});

async function postMessage(state: ChatSessionState, input: string) {
  const res = await chatMessage(
    new Request("http://localhost/api/chat/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state, input }),
    }),
  );
  expect(res.status).toBe(200);
  return chatTurnResultSchema.parse(await res.json());
}

describe("API contracts match src/types shapes", () => {
  it("GET /api/health reports status without secrets", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(["mock", "google"]).toContain(body.provider);
    expect(JSON.stringify(body)).not.toMatch(/token|secret|key/i);
  });

  it("GET /api/chat/opening returns a valid ChatTurnResult", async () => {
    const res = await chatOpening(new Request("http://localhost/api/chat/opening"));
    expect(res.status).toBe(200);
    const turn = chatTurnResultSchema.parse(await res.json());
    expect(turn.state.questionIndex).toBe(0);
    expect(turn.replies[0].role).toBe("assistant");
  });

  it("GET /api/chat/cancelled returns {message}", async () => {
    const res = await chatCancelled(new Request("http://localhost/api/chat/cancelled"));
    const body = await res.json();
    expect(typeof body.message).toBe("string");
  });

  it("the five-question intake walks the deterministic state machine", async () => {
    let turn = chatTurnResultSchema.parse(
      await (await chatOpening(new Request("http://localhost/api/chat/opening"))).json(),
    );
    const answers = ["Brew & Bean Café", "Café", "Coffee and bakes", "Students", "More foot traffic"];
    for (let i = 0; i < answers.length; i += 1) {
      turn = await postMessage(turn.state as ChatSessionState, answers[i]);
    }
    // After the fifth answer: summary + opt-in card, phase "optin".
    expect(turn.state.phase).toBe("optin");
    expect(turn.replies.some((r) => r.kind === "summary")).toBe(true);
    expect(turn.replies.some((r) => r.kind === "optin")).toBe(true);
    expect(turn.state.info).toMatchObject({
      name: "Brew & Bean Café",
      category: "Café",
      productsServices: "Coffee and bakes",
      targetCustomers: "Students",
      goals: "More foot traffic",
    });
  });

  it("POST /api/chat/skip-opt-in returns the tips turn", async () => {
    const state = {
      questionIndex: 4,
      phase: "optin",
      info: {
        name: "Brew & Bean Café",
        category: "Café",
        productsServices: "Coffee and bakes",
        targetCustomers: "Students",
        goals: "More foot traffic",
      },
    };
    const res = await skipOptIn(
      new Request("http://localhost/api/chat/skip-opt-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state }),
      }),
    );
    expect(res.status).toBe(200);
    const turn = chatTurnResultSchema.parse(await res.json());
    expect(turn.state.phase).toBe("tips");
    expect(turn.replies.some((r) => r.kind === "tips")).toBe(true);
  });

  it("chat/message validates the body with zod", async () => {
    for (const body of ["{}", JSON.stringify({ state: null, input: "x" }), JSON.stringify({ state: { questionIndex: 99, phase: "asking", info: {} }, input: "x" })]) {
      const res = await chatMessage(
        new Request("http://localhost/api/chat/message", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }),
      );
      expect(res.status).toBe(400);
    }
    void initialChatState;
  });
});
