"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types";
import { getChatOpening, sendChatMessage, skipGoogleOptIn } from "@/lib/apiClient";
import { CHAT_QUESTIONS, CANCELLED_MESSAGE } from "@/mock/chatScript";
import type { ChatTurnResult } from "@/lib/chatFlow";
import { initialChatState } from "@/lib/chatFlow";
import { SESSION_KEY, LAST_REPORT_KEY, stepForSession, validateSession, type SessionSnapshot, type SessionMessage } from "@/lib/chatSession";

let idCounter = 0;
function materialize(result: Pick<ChatTurnResult, "replies">): ChatMessage[] {
  return result.replies.map(r => ({...r, id:`msg-${Date.now()}-${++idCounter}`, createdAt:new Date().toISOString()}));
}
function clearStored() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* storage denied */ } }
function clearLegacy() { try { localStorage.removeItem("branvidia:chat-session-v1"); } catch { /* legacy storage denied */ } }
const empty: SessionSnapshot = {version:2, state:initialChatState, messages:[]};
export function useChatSession(autoStart: boolean) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(empty);
  const current = useRef(snapshot);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [ready, setReady] = useState(false);
  const [lastReport, setLastReport] = useState<string|null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const initialized = useRef(false);
  const commit = useCallback((next:SessionSnapshot) => {
    current.current = next; setSnapshot(next);
    if (validateSession(next)) {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { /* conversation still works without storage */ }
    } else clearStored();
  }, []);
  const fresh = useCallback(async () => {
    const token = ++generation.current;
    busy.current = true; clearStored(); setPending([]); setError(null); setTyping(true);
    commit(empty);
    try {
      const result = await getChatOpening();
      if (token === generation.current) commit({version:2, state:result.state, messages:materialize(result)});
    } catch { if (token === generation.current) setError("The assistant could not start. Check your connection and try again."); }
    finally { if (token === generation.current) { busy.current=false; setTyping(false); setReady(true); } }
  }, [commit]);
  const start = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;
    clearLegacy();
    let report: string|null = null;
    try {
      const id = sessionStorage.getItem(LAST_REPORT_KEY);
      if (id && /^[a-zA-Z0-9_-]{1,160}$/.test(id)) report=id;
    } catch { /* storage denied */ }
    setLastReport(report);
    let restored:SessionSnapshot|null = null;
    try { restored=validateSession(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null")); } catch { /* invalid storage */ }
    if (restored) { commit(restored); setReady(true); }
    else void fresh();
  }, [commit, fresh]);
  useEffect(() => { if (autoStart) start(); }, [autoStart,start]);
  const restart = useCallback(() => {
    clearLegacy();
    try { sessionStorage.removeItem(LAST_REPORT_KEY); } catch { /* storage denied */ }
    setLastReport(null); void fresh();
  }, [fresh]);
  const send = useCallback(async (text:string) => {
    if (busy.current || !text.trim() || !["asking","tips"].includes(current.current.state.phase)) return;
    busy.current=true; setError(null); setTyping(true);
    const token=generation.current;
    const user: SessionMessage[]=materialize({replies:[{role:"user",kind:"text",text:text.trim()}]}); setPending(user);
    try {
      const result=await sendChatMessage(current.current.state,text.trim());
      if (token===generation.current) {
        const question = current.current.state.phase === "asking" ? CHAT_QUESTIONS[current.current.state.questionIndex] : undefined;
        if (question) user[0].intakeValue = result.state.info[question.key];
        commit({version:2,state:result.state,messages:[...current.current.messages,...user,...materialize(result)]});
      }
    } catch { if (token===generation.current) setError("That message didn’t go through. Try sending it again."); }
    finally { if (token===generation.current) {setPending([]); setTyping(false); busy.current=false;} }
  }, [commit]);
  const skipOptIn = useCallback(async () => {
    if (busy.current || current.current.state.phase!=="optin") return;
    busy.current=true; setTyping(true); const token=generation.current;
    try {
      const result=await skipGoogleOptIn(current.current.state);
      if(token===generation.current) commit({version:2,state:result.state,messages:[...current.current.messages,...materialize(result)]});
    } catch { setError("Something went wrong. Try again."); }
    finally { if(token===generation.current) {busy.current=false;setTyping(false);} }
  },[commit]);
  const noteCancelled = useCallback(() => {
    if(current.current.state.phase!=="optin") return;
    commit({...current.current,messages:[...current.current.messages,...materialize({replies:[{role:"assistant",kind:"optin",text:CANCELLED_MESSAGE}]})]});
  },[commit]);
  const noteConnected = useCallback((label:string) => {
    if(!["optin","tips","awaiting-choice"].includes(current.current.state.phase)) return false;
    clearStored();
    commit({...current.current,state:{...current.current.state,phase:"analysis"},messages:[...current.current.messages,...materialize({replies:[{role:"assistant",kind:"analysis",text:`Google connected. I’m reading the ${label} profile now. Your report is on its way.`}]})]});
    return true;
  },[commit]);
  const complete = useCallback((id:string) => {
    clearStored();
    try { sessionStorage.setItem(LAST_REPORT_KEY,id); } catch { /* storage denied */ }
    generation.current++; current.current=empty; setSnapshot(empty); setLastReport(id);
  },[]);
  return { messages:[...snapshot.messages,...pending], typing, error, ready, started:ready,
    step:stepForSession(snapshot.state), phase:snapshot.state.phase, info:snapshot.state.info,
    lastReport, midConversation:snapshot.messages.some(m=>m.role==="user"),
    start, restart, send, skipOptIn, noteConnected, noteCancelled, complete };
}
