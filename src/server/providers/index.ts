import { MockBusinessProfileProvider } from "./mockProvider";
import {
  GoogleBusinessProfileProvider,
  googleConfigFromEnv,
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

export function getBusinessProfileProvider(
  env: NodeJS.ProcessEnv = process.env,
): BusinessProfileProvider {
  if (isMockMode(env)) return new MockBusinessProfileProvider();
  return new GoogleBusinessProfileProvider({ config: googleConfigFromEnv(env) });
}
