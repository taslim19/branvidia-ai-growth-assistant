import { describe, expect, it } from "vitest";
import { initialChatState, openingTurn, processChatTurn } from "@/lib/chatFlow";
import { validateSession } from "@/lib/chatSession";
import { answerQuestion } from "@/lib/chatFacts";

function run(inputs: string[]) {
  let turn = openingTurn();
  let state = turn.state;
  for (const i of inputs) { turn = processChatTurn(state, i); state = turn.state; }
  return { turn, state };
}

describe("mid-chat questions", () => {
  it("answers and resumes the same question without changing state", () => {
    const before = run(["Brew & Bean"]).state;
    const { turn, state } = run(["Brew & Bean", "What data do you access?"]);
    expect(state).toEqual(before);
    expect(turn.replies[0].text).toMatch(/name, email address and profile picture/);
    expect(turn.replies[1].text).toMatch(/kind of business/);
  });
  it("admits when it does not know", () => {
    expect(answerQuestion("what colour is the moon?").text).toMatch(/don't have a good answer/);
  });
  it("answers in the opt-in phase and supports edit + keep current", () => {
    const answers = ["Brew & Bean", "Café", "Coffee", "Students", "More traffic"];
    let { state } = run(answers);
    expect(state.phase).toBe("optin");
    const qa = processChatTurn(state, "Is it safe?");
    expect(qa.state).toEqual(state);
    const edit = processChatTurn(state, "Edit my answers");
    expect(edit.state.phase).toBe("asking");
    expect(edit.state.questionIndex).toBe(0);
    expect(edit.replies[1].quickReplies?.[0]).toBe("Keep current");
    let s = edit.state;
    s = processChatTurn(s, "Keep current").state;
    s = processChatTurn(s, "Bakery").state;
    for (const _ of [2, 3, 4]) s = processChatTurn(s, "Keep current").state;
    expect(s.phase).toBe("optin");
    expect(s.info).toEqual({ name: "Brew & Bean", category: "Bakery", productsServices: "Coffee", targetCustomers: "Students", goals: "More traffic" });
  });
  it("opt-in wording does not claim live Google profile access", () => {
    const { turn } = run(["a", "b", "c", "d", "e"]);
    const optin = turn.replies.find((r) => r.kind === "optin")!;
    expect(optin.text).toMatch(/sample profile/);
    expect(optin.text).not.toMatch(/I can read your Google Business Profile/);
  });
  it("a saved session with questions in it still validates", () => {
    let turn = openingTurn();
    let state = turn.state;
    const messages: any[] = []; let n = 0;
    const add = (r: any) => messages.push({ ...r, id: `m${n++}`, createdAt: new Date().toISOString() });
    turn.replies.forEach(add);
    for (const text of ["Brew & Bean", "Why do you ask?", "Café"]) {
      const user: any = { role: "user", kind: "text", text };
      const t = processChatTurn(state, text);
      if (t.state.questionIndex !== state.questionIndex || t.state.phase !== state.phase) user.intakeValue = text;
      add(user); t.replies.forEach(add); state = t.state;
    }
    expect(validateSession({ version: 2, state, messages })).not.toBeNull();
  });
});
void initialChatState;
