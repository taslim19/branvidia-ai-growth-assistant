import { MockBusinessProfileProvider } from "./mockProvider";
import {
  BUSINESS_MANAGE_SCOPE,
  DEFAULT_GOOGLE_SCOPES,
  GoogleBusinessProfileProvider,
  parseScopeList,
  type GoogleProviderConfig,
} from "./googleBusinessProfileProvider";
import type { BusinessProfileProvider } from "./types";

export interface UseMockResolution {
  useMock: boolean;
  source: "USE_MOCK" | "NEXT_PUBLIC_USE_MOCK" | "default";
  /** True when both variables are set and disagree (USE_MOCK wins). */
  conflict: boolean;
}

/**
 * The single mode resolution for the whole app, server and client alike.
 * USE_MOCK and NEXT_PUBLIC_USE_MOCK are aliases; USE_MOCK wins when both are
 * set. Mock mode is the default and needs no Google credentials; only an
 * explicit USE_MOCK=false (or its alias) selects the real
 * GoogleBusinessProfileProvider.
 *
 * Resolved on every call, never cached, so tests and env changes always see
 * the current choice.
 */
export function resolveUseMock(env: NodeJS.ProcessEnv = process.env): UseMockResolution {
  const norm = (v: string | undefined): boolean | undefined =>
    v === undefined ? undefined : v !== "false";
  const fromServer = norm(env.USE_MOCK);
  const fromPublic = norm(env.NEXT_PUBLIC_USE_MOCK);
  if (fromServer !== undefined) {
    return {
      useMock: fromServer,
      source: "USE_MOCK",
      conflict: fromPublic !== undefined && fromPublic !== fromServer,
    };
  }
  if (fromPublic !== undefined) {
    return { useMock: fromPublic, source: "NEXT_PUBLIC_USE_MOCK", conflict: false };
  }
  return { useMock: true, source: "default", conflict: false };
}

let conflictWarned = false;

export function isMockMode(env: NodeJS.ProcessEnv = process.env): boolean {
  const r = resolveUseMock(env);
  if (r.conflict && !conflictWarned) {
    conflictWarned = true;
    console.warn(
      `[branvidia] USE_MOCK=${env.USE_MOCK} and NEXT_PUBLIC_USE_MOCK=${env.NEXT_PUBLIC_USE_MOCK} ` +
        "disagree; USE_MOCK wins. Set them consistently (or set only one) to remove this warning.",
    );
  }
  return r.useMock;
}

export type ProfileDataMode = "mock" | "live";

export interface ProfileDataResolution {
  mode: ProfileDataMode;
  source: "GOOGLE_PROFILE_DATA" | "default";
}

/**
 * Where business profile, review and photo data comes from when the app runs
 * server-backed (USE_MOCK=false). Mock is the default and needs no Google API
 * access; "live" selects the real Business Profile APIs, which require
 * Google's API approval (the Branvidia Cloud project's quota is currently 0).
 * Only the exact value "live" opts in; anything else stays mock.
 */
export function resolveProfileData(
  env: NodeJS.ProcessEnv = process.env,
): ProfileDataResolution {
  if (env.GOOGLE_PROFILE_DATA === "live") {
    return { mode: "live", source: "GOOGLE_PROFILE_DATA" };
  }
  return {
    mode: "mock",
    source: env.GOOGLE_PROFILE_DATA === undefined ? "default" : "GOOGLE_PROFILE_DATA",
  };
}

export function isLiveProfileData(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveProfileData(env).mode === "live";
}

/**
 * The scopes a real Google sign-in requests. Default: openid email profile
 * (identity only - the hybrid mode, where profile/reviews/photos stay on the
 * mock provider). GOOGLE_SCOPES overrides the base list (space or comma
 * separated). When the Business Profile data path is live, business.manage is
 * required and added if the configured list does not include it.
 */
export function resolveGoogleScopes(env: NodeJS.ProcessEnv = process.env): string[] {
  const base = parseScopeList(env.GOOGLE_SCOPES) ?? [...DEFAULT_GOOGLE_SCOPES];
  if (!isMockMode(env) && isLiveProfileData(env) && !base.includes(BUSINESS_MANAGE_SCOPE)) {
    return [...base, BUSINESS_MANAGE_SCOPE];
  }
  return base;
}

function googleConfig(env: NodeJS.ProcessEnv): GoogleProviderConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
    scopes: resolveGoogleScopes(env),
  };
}

/**
 * The business profile / reviews / photos data source. Mock unless the app
 * is server-backed AND GOOGLE_PROFILE_DATA=live; the hybrid default pairs a
 * real Google sign-in with this mock provider.
 */
export function getBusinessProfileProvider(
  env: NodeJS.ProcessEnv = process.env,
): BusinessProfileProvider {
  if (isMockMode(env) || !isLiveProfileData(env)) return new MockBusinessProfileProvider();
  return new GoogleBusinessProfileProvider({ config: googleConfig(env) });
}

/**
 * The sign-in (OAuth) side, selected independently of the data provider.
 * Mock mode simulates the whole consent handshake credential-free; any
 * server-backed run (hybrid or live data) uses real Google OAuth with the
 * scopes from resolveGoogleScopes and needs GOOGLE_CLIENT_ID/SECRET.
 */
export function getGoogleSignInProvider(
  env: NodeJS.ProcessEnv = process.env,
): BusinessProfileProvider {
  if (isMockMode(env)) return new MockBusinessProfileProvider();
  return new GoogleBusinessProfileProvider({ config: googleConfig(env) });
}
