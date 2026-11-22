import { resolveUseMock } from "./providers/index";

/**
 * The server resolves the mock/real mode per request and injects it into the
 * page, so the browser bundle follows the exact same decision - including
 * USE_MOCK=false set at runtime with no rebuild. The client reads
 * window.__BRANVIDIA_USE_MOCK__ (see isMockModeClient in src/lib/apiClient.ts).
 */
export function clientModeInitScript(env: NodeJS.ProcessEnv = process.env): string {
  const { useMock } = resolveUseMock(env);
  return `window.__BRANVIDIA_USE_MOCK__=${JSON.stringify(useMock ? "true" : "false")};`;
}
