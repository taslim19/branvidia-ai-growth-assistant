// Client readers for the per-request mode config the server injects into the
// page (see clientModeInitScript in src/server/clientMode.ts). All are safe to
// call without a window (SSR/tests): they fall back to the credential-free
// defaults, which is also what a static mock build serves.

export type ProfileDataModeClient = "mock" | "live";

/**
 * Where business profile/reviews/photos come from in this deployment:
 * "live" only when the real Business Profile APIs are called, otherwise
 * "mock" (the hybrid default: real Google sign-in, sample business data).
 */
export function profileDataModeClient(): ProfileDataModeClient {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __BRANVIDIA_PROFILE_DATA__?: string })
      .__BRANVIDIA_PROFILE_DATA__;
    if (injected === "live") return "live";
  }
  return "mock";
}

/** The exact OAuth scopes a real Google sign-in requests in this deployment. */
export function googleScopesClient(): string[] {
  if (typeof window !== "undefined") {
    const injected = (window as unknown as { __BRANVIDIA_GOOGLE_SCOPES__?: string[] })
      .__BRANVIDIA_GOOGLE_SCOPES__;
    if (Array.isArray(injected) && injected.every((s) => typeof s === "string")) {
      return injected;
    }
  }
  return ["openid", "email", "profile"];
}
