// Maps the OAuth scopes a sign-in really requests to the plain-language
// items the in-app permission screen lists, so the screen can never claim
// access the deployment does not ask Google for.

export interface ScopeDisplay {
  scope: string;
  why: string;
}

const KNOWN_SCOPES: Record<string, ScopeDisplay[]> = {
  openid: [
    { scope: "Confirm it’s you when you sign in", why: "to keep your connection secure" },
  ],
  email: [{ scope: "See your email address", why: "to identify your account" }],
  profile: [
    { scope: "See your name and profile picture", why: "to show who is connected" },
  ],
  "https://www.googleapis.com/auth/business.manage": [
    {
      scope: "See your business name, category, hours and description",
      why: "to check what’s missing",
    },
    {
      scope: "Read your reviews and ratings",
      why: "to find patterns in what customers say",
    },
    { scope: "See your photos", why: "to check what kinds of photos you have" },
  ],
};

/**
 * The permission list for exactly these scopes. Unknown scopes are shown as
 * Google names them rather than hidden, so the list always covers everything
 * being requested.
 */
export function scopeDisplayList(scopes: string[]): ScopeDisplay[] {
  const items: ScopeDisplay[] = [];
  for (const scope of scopes) {
    const known = KNOWN_SCOPES[scope];
    if (known) {
      items.push(...known);
    } else {
      items.push({ scope, why: "listed exactly as Google requests it" });
    }
  }
  return items;
}

/** True when the requested scopes include any Business Profile data access. */
export function requestsBusinessData(scopes: string[]): boolean {
  return scopes.includes("https://www.googleapis.com/auth/business.manage");
}
