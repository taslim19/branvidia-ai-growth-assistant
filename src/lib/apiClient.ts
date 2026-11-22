// The single seam between the UI and data. Every function resolves from
// src/mock/ in mock mode (the default: no Google credentials needed to run,
// test or demo). Components never touch mock data directly.
//
// With USE_MOCK=false (or its alias NEXT_PUBLIC_USE_MOCK=false):
//   - The Google functions call the built-in Next.js routes under
//     /api/oauth/google/* and /api/google/*, backed by the real
//     GoogleBusinessProfileProvider (see src/server/providers/). No session
//     yet -> the browser is redirected into the OAuth consent flow.
//   - Chat, analysis and report calls target the Phase 2 route handlers;
//     set NEXT_PUBLIC_API_BASE_URL=/api to use the built-in backend (live
//     mode). When that variable points at an external backend instead, the
//     Google functions use the legacy paths on that base.
//
// To force a failure and test error states in mock mode, either:
//   - open /connect/google?fail=listBusinessLocations (or any function name), or
//   - run localStorage.setItem('branvidia:fail:runAnalysis', '1') in devtools.

import type {
  BusinessLocation,
  BusinessProfile,
  GoogleAccount,
  Report,
  SavedReportSummary,
} from "@/types";
import type { ChatSessionState, ChatTurnResult } from "./chatFlow";
import { processChatTurn, openingTurn, skipOptInTurn } from "./chatFlow";
import { MOCK_GOOGLE_ACCOUNT, MOCK_LOCATIONS, MOCK_PROFILES } from "@/mock/businessProfile";
import { buildMockReport, REPORT_ID } from "@/mock/reportContent";
import { CANCELLED_MESSAGE } from "@/mock/chatScript";
import type { BusinessInfo } from "@/types";

// The server resolves the mock/real mode per request (USE_MOCK gate) and
// injects it into the page as window.__BRANVIDIA_USE_MOCK__, so USE_MOCK=false
// alone switches the whole app - no rebuild needed. The build-time
// NEXT_PUBLIC_USE_MOCK is the fallback for non-browser contexts.
export function isMockModeClient(): boolean {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __BRANVIDIA_USE_MOCK__?: string })
      .__BRANVIDIA_USE_MOCK__;
    if (injected !== undefined) return injected !== "false";
  }
  return process.env.NEXT_PUBLIC_USE_MOCK !== "false";
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
// Live-backend mode: an API base is configured (set NEXT_PUBLIC_API_BASE_URL=/api
// for the built-in route handlers). Chat, analysis and reports then go to the
// backend; without it, mock mode serves them client-side as before.
const LIVE_BACKEND = API_BASE !== "";
// Same-origin built-in routes when no external backend is configured.
const GOOGLE_PREFIX = API_BASE ? "" : "/api";

function isLocalMock(): boolean {
  return !LIVE_BACKEND && isMockModeClient();
}

const REPORTS_KEY = "branvidia:saved-reports";

function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function forcedFailure(fnName: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(`branvidia:fail:${fnName}`) === "1") return true;
    const params = new URLSearchParams(window.location.search);
    return params.get("fail") === fnName;
  } catch {
    return false;
  }
}

async function mockResolve<T>(fnName: string, value: T, ms?: number): Promise<T> {
  await delay(ms);
  if (forcedFailure(fnName)) {
    throw new Error(`Mock failure forced for ${fnName}`);
  }
  return value;
}

async function realFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// --- Chat ---

export async function sendChatMessage(
  state: ChatSessionState,
  input: string,
): Promise<ChatTurnResult> {
  if (isLocalMock()) return mockResolve("sendChatMessage", processChatTurn(state, input));
  return realFetch<ChatTurnResult>("/chat/message", {
    method: "POST",
    body: JSON.stringify({ state, input }),
  });
}

export async function getChatOpening(): Promise<ChatTurnResult> {
  if (isLocalMock()) return mockResolve("sendChatMessage", openingTurn(), 500);
  return realFetch<ChatTurnResult>("/chat/opening");
}

export async function skipGoogleOptIn(state: ChatSessionState): Promise<ChatTurnResult> {
  if (isLocalMock()) return mockResolve("sendChatMessage", skipOptInTurn(state));
  return realFetch<ChatTurnResult>("/chat/skip-opt-in", {
    method: "POST",
    body: JSON.stringify({ state }),
  });
}

export async function getCancelledOptInMessage(): Promise<string> {
  if (isLocalMock()) return mockResolve("sendChatMessage", CANCELLED_MESSAGE, 250);
  return realFetch<{ message: string }>("/chat/cancelled").then((r) => r.message);
}

// --- Google connection (simulated consent flow) ---

export async function startGoogleConnect(): Promise<{ accounts: GoogleAccount[] }> {
  if (isLocalMock()) return mockResolve("startGoogleConnect", { accounts: [MOCK_GOOGLE_ACCOUNT] });
  const res = await fetch(`${API_BASE}${GOOGLE_PREFIX}/google/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    // No Google session yet: hand the browser to the built-in OAuth start
    // endpoint; the callback returns here with the session cookie set.
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`/api/oauth/google/start?returnTo=${encodeURIComponent(returnTo)}`);
    return new Promise<{ accounts: GoogleAccount[] }>(() => {}); // navigation in progress
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as { accounts: GoogleAccount[] };
}

export async function listBusinessLocations(accountId: string): Promise<BusinessLocation[]> {
  if (isLocalMock()) return mockResolve("listBusinessLocations", MOCK_LOCATIONS, 600);
  return realFetch<BusinessLocation[]>(
    `${GOOGLE_PREFIX}/google/accounts/${encodeURIComponent(accountId)}/locations`,
  );
}

export async function getBusinessProfile(locationId: string): Promise<BusinessProfile> {
  if (isLocalMock()) {
    const profile = MOCK_PROFILES[locationId] ?? MOCK_PROFILES["loc-indiranagar"];
    return mockResolve("getBusinessProfile", profile);
  }
  return realFetch<BusinessProfile>(
    `${GOOGLE_PREFIX}/google/locations/${encodeURIComponent(locationId)}/profile`,
  );
}

export async function disconnectGoogle(): Promise<{ ok: boolean }> {
  if (isLocalMock()) return mockResolve("disconnectGoogle", { ok: true }, 500);
  return realFetch<{ ok: boolean }>(`${GOOGLE_PREFIX}/google/disconnect`, { method: "POST" });
}

// --- Analysis and reports ---

export async function runAnalysis(
  locationId: string,
  intake?: Partial<BusinessInfo>,
): Promise<Report> {
  if (isLocalMock()) return mockResolve("runAnalysis", buildMockReport({ locationId, intake }), 900);
  return realFetch<Report>(`/locations/${locationId}/analysis`, {
    method: "POST",
    body: JSON.stringify({ intake }),
  });
}

function readSavedReports(): SavedReportSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedReportSummary[]) : [];
  } catch {
    return [];
  }
}

export async function listReports(): Promise<SavedReportSummary[]> {
  if (isLocalMock()) return mockResolve("listReports", readSavedReports(), 250);
  return realFetch<SavedReportSummary[]>("/reports");
}

function readFullReport(id: string): Report | null {
  if (typeof window === "undefined") return null;
  const fromMemory = memoryReports.get(id);
  if (fromMemory) return fromMemory;
  try {
    const cached = window.sessionStorage.getItem(`branvidia:report:${id}`);
    if (cached) return JSON.parse(cached) as Report;
  } catch { /* storage denied */ }
  try {
    const raw = window.localStorage.getItem(`branvidia:report:${id}`);
    return raw ? (JSON.parse(raw) as Report) : null;
  } catch {
    return null;
  }
}

export async function getReport(reportId: string): Promise<Report> {
  if (isLocalMock()) {
    const saved = readFullReport(reportId);
    const report =
      saved ?? (reportId === REPORT_ID ? buildMockReport({ fixedId: REPORT_ID }) : null);
    if (!report) {
      await delay(250);
      throw new Error("Report not found");
    }
    return mockResolve("getReport", report);
  }
  if (reportId === REPORT_ID) {
    // The homepage "See a sample report" link is demo data in every mode:
    // serve the fixture when the backend has no report with that id.
    try {
      return await realFetch<Report>(`/reports/${reportId}`);
    } catch {
      return buildMockReport({ fixedId: REPORT_ID });
    }
  }
  return realFetch<Report>(`/reports/${reportId}`);
}

// In-session fallback for reports: when localStorage is blocked (private mode,
// denied storage, quota), the report the user just generated still survives the
// client-side navigation to its page, and the UI can say honestly that it was
// not saved to the dashboard history.
const memoryReports = new Map<string, Report>();
const unpersistedReportIds = new Set<string>();

export function isReportPersisted(reportId: string): boolean {
  return !unpersistedReportIds.has(reportId);
}

// Saved-report persistence is a UI concern in mock mode; the hook calls this.
export function persistReport(report: Report): void {
  if (typeof window === "undefined") return;
  memoryReports.set(report.id, report);
  try { window.sessionStorage.setItem(`branvidia:report:${report.id}`, JSON.stringify(report)); } catch { /* storage denied */ }
  try {
    const summaries = readSavedReports().filter((r) => r.id !== report.id);
    summaries.unshift({
      id: report.id,
      businessName: report.businessName,
      score: report.score,
      createdAt: report.createdAt,
    });
    window.localStorage.setItem(REPORTS_KEY, JSON.stringify(summaries.slice(0, 20)));
    window.localStorage.setItem(`branvidia:report:${report.id}`, JSON.stringify(report));
    unpersistedReportIds.delete(report.id);
  } catch {
    // localStorage can be unavailable (private mode, quota). The report stays
    // readable in memory for this session; the report page warns it was not saved.
    unpersistedReportIds.add(report.id);
  }
}

export function removeSavedReport(reportId: string): void {
  if (typeof window === "undefined") return;
  memoryReports.delete(reportId);
  unpersistedReportIds.delete(reportId);
  try {
    const summaries = readSavedReports().filter((r) => r.id !== reportId);
    window.localStorage.setItem(REPORTS_KEY, JSON.stringify(summaries));
    window.localStorage.removeItem(`branvidia:report:${reportId}`);
  } catch {
    // best-effort
  }
}
