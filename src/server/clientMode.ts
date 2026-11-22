import { isLiveProfileData, resolveGoogleScopes, resolveUseMock } from "./providers/index";

/**
 * The server resolves the mock/real mode per request and injects it into the
 * page, so the browser bundle follows the exact same decision - including
 * USE_MOCK=false set at runtime with no rebuild. The client reads
 * window.__BRANVIDIA_USE_MOCK__ (see isMockModeClient in src/lib/apiClient.ts).
 *
 * Also injected, for honest labelling in the UI:
 * - __BRANVIDIA_PROFILE_DATA__: where business profile/reviews/photos come
 *   from ("mock" in the hybrid default; "live" only when the real Business
 *   Profile APIs are called), and
 * - __BRANVIDIA_GOOGLE_SCOPES__: the exact OAuth scopes a real sign-in
 *   requests, so the permission screen lists only what is really requested.
 */
export function clientModeInitScript(env: NodeJS.ProcessEnv = process.env): string {
  const { useMock } = resolveUseMock(env);
  const profileData = !useMock && isLiveProfileData(env) ? "live" : "mock";
  const scopes = resolveGoogleScopes(env);
  return (
    `window.__BRANVIDIA_USE_MOCK__=${JSON.stringify(useMock ? "true" : "false")};` +
    `window.__BRANVIDIA_PROFILE_DATA__=${JSON.stringify(profileData)};` +
    `window.__BRANVIDIA_GOOGLE_SCOPES__=${JSON.stringify(scopes)};`
  );
}
