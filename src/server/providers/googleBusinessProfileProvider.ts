import type {
  BusinessLocation,
  BusinessProfile,
  DayHours,
  GoogleAccount,
  PhotoItem,
  PhotoType,
  ProfileFieldCheck,
  Review,
} from "@/types";
import { ProviderApiError, ProviderNotConfiguredError } from "./types";
import type { BusinessProfileProvider, ConnectedAccount, TokenSet } from "./types";

// Real Google endpoints, all read-only.
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const LOCATIONS_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_GMB_API = "https://mybusiness.googleapis.com/v4";

// business.manage is the only scope Google offers for Business Profile data;
// this app only ever reads.
export const BUSINESS_MANAGE_SCOPE = "https://www.googleapis.com/auth/business.manage";

// Hybrid mode (the default when the app runs server-backed): a real Google
// sign-in asks for identity only - no Business Profile access at all.
export const DEFAULT_GOOGLE_SCOPES = ["openid", "email", "profile"];

/** Split a GOOGLE_SCOPES value (space or comma separated) into a clean list. */
export function parseScopeList(raw: string | undefined): string[] | null {
  if (raw === undefined) return null;
  const scopes = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return scopes.length > 0 ? scopes.filter((s, i) => scopes.indexOf(s) === i) : null;
}

const LOCATION_READ_MASK = [
  "name",
  "title",
  "primaryCategory",
  "websiteUri",
  "phoneNumbers",
  "regularHours",
  "storefrontAddress",
  "profile",
  "attributes",
].join(",");

export interface GoogleProviderConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  /**
   * OAuth scopes to request. Undefined keeps the historical default (basic
   * sign-in scopes plus business.manage). The factories in ./index.ts always
   * pass an explicit list resolved from GOOGLE_SCOPES + GOOGLE_PROFILE_DATA.
   */
  scopes?: string[];
}

export function googleConfigFromEnv(env: NodeJS.ProcessEnv = process.env): GoogleProviderConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI,
  };
}

/** Matches the global fetch signature so tests can inject fixtures. */
export type FetchImpl = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; statusText: string; text(): Promise<string> }>;

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

const STAR_RATING: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

const GMB_MEDIA_CATEGORY: Record<string, PhotoType> = {
  EXTERIOR: "exterior",
  INTERIOR: "interior",
  FOOD_AND_DRINK: "food",
  MENU: "menu",
  TEAMS: "team",
};

const GOOGLE_DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * The real provider: Google OAuth 2.0 (with PKCE) plus the Business Profile
 * Account Management, Business Information and legacy GMB APIs.
 *
 * Complete code, but dormant unless USE_MOCK=false AND the Google OAuth
 * credentials are configured; without them every method fails fast with
 * ProviderNotConfiguredError, which the API routes surface as HTTP 503. It
 * never runs during a normal credential-free demo, build or test.
 *
 * fetchImpl is injectable so tests can exercise the whole class against
 * controlled fixtures without touching Google.
 */
export class GoogleBusinessProfileProvider implements BusinessProfileProvider {
  readonly name = "google" as const;
  readonly requiresCredentials = true;

  private readonly config: GoogleProviderConfig;
  private readonly fetchImpl: FetchImpl;

  constructor(options: { config?: GoogleProviderConfig; fetchImpl?: FetchImpl } = {}) {
    this.config = options.config ?? googleConfigFromEnv();
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl);
  }

  /** The scopes this provider instance requests on the consent screen. */
  requestedScopes(): string[] {
    return this.config.scopes ?? [...DEFAULT_GOOGLE_SCOPES, BUSINESS_MANAGE_SCOPE];
  }

  missingConfig(): string[] {
    const missing: string[] = [];
    if (!this.config.clientId) missing.push("GOOGLE_CLIENT_ID");
    if (!this.config.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
    return missing;
  }

  private requireConfig(): void {
    const missing = this.missingConfig();
    if (missing.length > 0) throw new ProviderNotConfiguredError(missing);
  }

  private redirectUri(fallback: string): string {
    return this.config.redirectUri ?? fallback;
  }

  // ---- OAuth ----

  buildAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): string {
    this.requireConfig();
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", this.config.clientId as string);
    url.searchParams.set("redirect_uri", this.redirectUri(input.redirectUri));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.requestedScopes().join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", input.state);
    url.searchParams.set("code_challenge", input.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  async exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<ConnectedAccount> {
    this.requireConfig();
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: this.config.clientId as string,
      client_secret: this.config.clientSecret as string,
      redirect_uri: this.redirectUri(input.redirectUri),
      code_verifier: input.codeVerifier,
    }).toString();
    const data = (await this.fetchJson(
      TOKEN_ENDPOINT,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      },
      "Token exchange",
    )) as TokenResponse;
    if (!data.access_token) {
      throw new ProviderApiError(502, "Token exchange returned no access token");
    }
    const tokens: TokenSet = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      scope: data.scope ?? this.requestedScopes().join(" "),
      tokenType: data.token_type ?? "Bearer",
    };
    const info = (await this.fetchJson(
      USERINFO_ENDPOINT,
      { headers: { authorization: `Bearer ${tokens.accessToken}` } },
      "Userinfo",
    )) as { sub?: string; name?: string; email?: string };
    const account: GoogleAccount = {
      id: info.sub ?? info.email ?? "google-user",
      name: info.name ?? info.email ?? "Google user",
      email: info.email ?? "",
    };
    return { account, tokens };
  }

  /** Refresh an expired access token. Mutates the TokenSet in place so the
   *  owning server session keeps the fresh values. */
  private async freshTokens(tokens: TokenSet): Promise<TokenSet> {
    if (tokens.expiresAt > Date.now() + 60_000) return tokens;
    if (!tokens.refreshToken) {
      throw new ProviderApiError(401, "Access token expired and no refresh token is stored");
    }
    this.requireConfig();
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: this.config.clientId as string,
      client_secret: this.config.clientSecret as string,
    }).toString();
    const data = (await this.fetchJson(
      TOKEN_ENDPOINT,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      },
      "Token refresh",
    )) as TokenResponse;
    if (!data.access_token) {
      throw new ProviderApiError(502, "Token refresh returned no access token");
    }
    tokens.accessToken = data.access_token;
    tokens.expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
    return tokens;
  }

  // ---- Data ----

  async listAccounts(tokens: TokenSet | null): Promise<GoogleAccount[]> {
    const t = await this.requireTokens(tokens);
    const data = (await this.fetchJson(
      `${ACCOUNTS_API}/accounts`,
      { headers: { authorization: `Bearer ${t.accessToken}` } },
      "List accounts",
    )) as { accounts?: { name?: string; accountName?: string; primaryOwner?: string }[] };
    return (data.accounts ?? []).map((a) => ({
      id: a.name ?? "",
      name: a.accountName ?? a.name ?? "Google Business account",
      email: a.primaryOwner ?? "",
    }));
  }

  async listLocations(
    accountId: string,
    tokens: TokenSet | null,
  ): Promise<BusinessLocation[]> {
    const t = await this.requireTokens(tokens);
    const params = new URLSearchParams({ readMask: "name,title,storefrontAddress", pageSize: "100" });
    const data = (await this.fetchJson(
      `${LOCATIONS_API}/${accountId}/locations?${params}`,
      { headers: { authorization: `Bearer ${t.accessToken}` } },
      "List locations",
    )) as {
      locations?: {
        name?: string;
        title?: string;
        storefrontAddress?: {
          addressLines?: string[];
          sublocality?: string;
          locality?: string;
        };
      }[];
    };
    return (data.locations ?? []).map((loc) => ({
      id: loc.name ?? "",
      name: loc.title ?? "Untitled location",
      area:
        loc.storefrontAddress?.sublocality ??
        loc.storefrontAddress?.addressLines?.[0] ??
        "",
      city: loc.storefrontAddress?.locality ?? "",
    }));
  }

  async getProfile(locationId: string, tokens: TokenSet | null): Promise<BusinessProfile> {
    const t = await this.requireTokens(tokens);
    const headers = { authorization: `Bearer ${t.accessToken}` };

    // The location resource is required; reviews and media counts are
    // best-effort (they need extra API enablement/permissions) so a failure
    // there degrades to an honest note instead of failing the whole profile.
    const locationPromise = this.fetchJson(
      `${LOCATIONS_API}/${locationId}?readMask=${LOCATION_READ_MASK}`,
      { headers },
      "Get location",
    );
    const [locationResult, reviewsResult, mediaResult] = await Promise.allSettled([
      locationPromise,
      this.fetchJson(`${LEGACY_GMB_API}/${locationId}/reviews?pageSize=100`, { headers }, "List reviews"),
      this.fetchJson(`${LEGACY_GMB_API}/${locationId}/media?pageSize=1`, { headers }, "List media"),
    ]);
    if (locationResult.status === "rejected") throw locationResult.reason;

    const loc = locationResult.value as {
      title?: string;
      primaryCategory?: { displayName?: string };
      websiteUri?: string;
      phoneNumbers?: { primaryPhone?: string };
      regularHours?: {
        periods?: {
          openDay?: string;
          openTime?: { hours?: number; minutes?: number };
          closeTime?: { hours?: number; minutes?: number };
        }[];
      };
      storefrontAddress?: {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
      };
      profile?: { description?: string };
      attributes?: { name?: string; displayName?: string; values?: unknown[] }[];
    };

    let rating = 0;
    let reviewCount = 0;
    let reviewsUnavailable = false;
    if (reviewsResult.status === "fulfilled") {
      const data = reviewsResult.value as {
        reviews?: { starRating?: string }[];
        totalReviewCount?: number;
        averageRating?: number;
      };
      const reviews = data.reviews ?? [];
      reviewCount = data.totalReviewCount ?? reviews.length;
      if (typeof data.averageRating === "number") {
        rating = Math.round(data.averageRating * 10) / 10;
      } else if (reviews.length > 0) {
        const total = reviews.reduce((sum, r) => sum + (STAR_RATING[r.starRating ?? ""] ?? 0), 0);
        rating = Math.round((total / reviews.length) * 10) / 10;
      }
    } else {
      reviewsUnavailable = true;
    }

    let photoCount: number | null = null;
    if (mediaResult.status === "fulfilled") {
      const data = mediaResult.value as { totalMediaItemCount?: number };
      photoCount = data.totalMediaItemCount ?? 0;
    }

    const hours = mapHours(loc.regularHours?.periods);
    const attributes = (loc.attributes ?? []).map((a) => ({
      label: a.displayName ?? (a.name ?? "").split("/").pop() ?? "Attribute",
      set: Array.isArray(a.values) && a.values.some((v) => v === true || v === "true"),
    }));
    const addressParts = [
      ...(loc.storefrontAddress?.addressLines ?? []),
      loc.storefrontAddress?.locality,
      loc.storefrontAddress?.postalCode,
    ].filter((p): p is string => Boolean(p));

    const profile: BusinessProfile = {
      locationId,
      name: loc.title ?? "",
      category: loc.primaryCategory?.displayName ?? "",
      rating,
      reviewCount,
      description: loc.profile?.description ?? "",
      phone: loc.phoneNumbers?.primaryPhone ?? "",
      address: addressParts.join(", "),
      hours,
      websiteUrl: loc.websiteUri ?? null,
      // The Business Information API does not expose a menu URL, so a real
      // profile cannot populate this field; the check below says so honestly.
      menuUrl: null,
      attributes,
      fieldChecks: [],
    };
    profile.fieldChecks = buildFieldChecks(profile, photoCount, reviewsUnavailable);
    return profile;
  }

  /**
   * Individual reviews for the analysis pipeline: the same legacy GMB
   * endpoint getProfile uses for aggregates, here mapped record by record.
   * Nothing is synthesized; a failed fetch propagates so the analysis route
   * fails clean instead of producing a partial report.
   */
  async getRecentReviews(locationId: string, tokens: TokenSet | null): Promise<Review[]> {
    const t = await this.requireTokens(tokens);
    const headers = { authorization: `Bearer ${t.accessToken}` };
    const data = (await this.fetchJson(
      `${LEGACY_GMB_API}/${locationId}/reviews?pageSize=100`,
      { headers },
      "List reviews",
    )) as {
      reviews?: {
        reviewId?: string;
        reviewer?: { displayName?: string };
        starRating?: string;
        comment?: string;
        createTime?: string;
        reviewReply?: { comment?: string };
      }[];
    };
    return (data.reviews ?? [])
      .filter((r) => (STAR_RATING[r.starRating ?? ""] ?? 0) > 0)
      .map((r, i) => ({
        id: r.reviewId ?? `review-${i}`,
        author: r.reviewer?.displayName ?? "Google user",
        rating: STAR_RATING[r.starRating ?? ""] ?? 0,
        date: r.createTime ?? "",
        text: r.comment ?? "",
        replied: Boolean(r.reviewReply?.comment),
        ...(r.reviewReply?.comment ? { replyText: r.reviewReply.comment } : {}),
      }));
  }

  /**
   * Photos for the analysis pipeline, mapped from GMB media categories.
   * Videos and photos Google has not categorized into a type the pipeline
   * scores are left out rather than guessed.
   */
  async getRecentPhotos(locationId: string, tokens: TokenSet | null): Promise<PhotoItem[]> {
    const t = await this.requireTokens(tokens);
    const headers = { authorization: `Bearer ${t.accessToken}` };
    const data = (await this.fetchJson(
      `${LEGACY_GMB_API}/${locationId}/media?pageSize=100`,
      { headers },
      "List media",
    )) as {
      mediaItems?: {
        name?: string;
        mediaFormat?: string;
        googleUrl?: string;
        description?: string;
        locationAssociation?: { category?: string };
      }[];
    };
    return (data.mediaItems ?? [])
      .filter(
        (m) =>
          m.mediaFormat === "PHOTO" &&
          Boolean(m.googleUrl) &&
          Boolean(GMB_MEDIA_CATEGORY[m.locationAssociation?.category ?? ""]),
      )
      .map((m, i) => {
        const type = GMB_MEDIA_CATEGORY[m.locationAssociation?.category ?? ""];
        return {
          id: m.name ?? `photo-${i}`,
          src: m.googleUrl as string,
          alt: m.description ?? `${type} photo`,
          type,
        };
      });
  }

  async revoke(tokens: TokenSet | null): Promise<void> {
    if (!tokens) return;
    const res = await this.fetchImpl(
      `${REVOKE_ENDPOINT}?token=${encodeURIComponent(tokens.accessToken)}`,
      { method: "POST" },
    );
    if (!res.ok) {
      throw new ProviderApiError(res.status, `Token revocation failed (${res.status})`);
    }
  }

  // ---- internals ----

  private async requireTokens(tokens: TokenSet | null): Promise<TokenSet> {
    this.requireConfig();
    if (!tokens) {
      throw new ProviderApiError(401, "No Google session. Connect a Google account first.");
    }
    return this.freshTokens(tokens);
  }

  private async fetchJson(
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string },
    context: string,
  ): Promise<unknown> {
    const res = await this.fetchImpl(url, init);
    const text = await res.text();
    if (!res.ok) {
      let detail = text.slice(0, 300);
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        detail = parsed.error?.message ?? detail;
      } catch {
        // keep the raw snippet
      }
      throw new ProviderApiError(res.status, `${context} failed (${res.status}): ${detail}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ProviderApiError(res.status, `${context}: Google returned invalid JSON`);
    }
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function mapTime(t?: { hours?: number; minutes?: number }): string | null {
  if (!t || typeof t.hours !== "number") return null;
  return `${pad2(t.hours)}:${pad2(t.minutes ?? 0)}`;
}

function mapHours(
  periods?: {
    openDay?: string;
    openTime?: { hours?: number; minutes?: number };
    closeTime?: { hours?: number; minutes?: number };
  }[],
): DayHours[] {
  return GOOGLE_DAY_ORDER.map((googleDay, i) => {
    const period = (periods ?? []).find((p) => p.openDay === googleDay);
    return {
      day: DAY_LABELS[i],
      open: period ? mapTime(period.openTime) : null,
      close: period ? mapTime(period.closeTime) : null,
    };
  });
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildFieldChecks(
  p: BusinessProfile,
  photoCount: number | null,
  reviewsUnavailable: boolean,
): ProfileFieldCheck[] {
  const checks: ProfileFieldCheck[] = [];
  checks.push(
    p.name
      ? { field: "Business name", status: "ok", note: p.name }
      : { field: "Business name", status: "missing", note: "No business name on the profile." },
  );
  checks.push(
    p.category
      ? { field: "Category", status: "ok", note: p.category }
      : { field: "Category", status: "missing", note: "No primary category is set." },
  );
  const words = wordCount(p.description);
  if (!p.description) {
    checks.push({
      field: "Description",
      status: "missing",
      note: "No business description. Customers and search learn nothing about the business.",
    });
  } else if (words < 25) {
    checks.push({
      field: "Description",
      status: "warning",
      note: `Only ${words} words. It says almost nothing about what makes the business worth a visit.`,
    });
  } else {
    checks.push({ field: "Description", status: "ok", note: `${words} words.` });
  }
  const weekendClosed = p.hours
    .filter((h) => h.day === "Saturday" || h.day === "Sunday")
    .every((h) => h.open === null);
  checks.push(
    weekendClosed
      ? {
          field: "Weekend hours",
          status: "missing",
          note: "Saturday and Sunday hours are not set. Weekend searchers see “Hours might differ”.",
        }
      : { field: "Weekend hours", status: "ok", note: "Weekend hours are set." },
  );
  checks.push(
    p.websiteUrl
      ? { field: "Website", status: "ok", note: p.websiteUrl }
      : {
          field: "Website",
          status: "missing",
          note: "No website link. Google shows a “Website” button when one is set.",
        },
  );
  checks.push({
    field: "Menu link",
    status: "missing",
    note: "Google’s Business Information API does not return the menu URL, so it cannot be checked here.",
  });
  checks.push(
    p.phone
      ? { field: "Phone", status: "ok", note: p.phone }
      : { field: "Phone", status: "missing", note: "No phone number on the profile." },
  );
  if (reviewsUnavailable) {
    checks.push({
      field: "Reviews",
      status: "warning",
      note: "Review data could not be read for this location (the reviews API may not be enabled).",
    });
  }
  if (photoCount === null) {
    checks.push({
      field: "Photos",
      status: "warning",
      note: "Photo count unavailable (the media API may not be enabled).",
    });
  } else {
    checks.push(
      photoCount === 0
        ? { field: "Photos", status: "missing", note: "No photos on the profile." }
        : { field: "Photos", status: "ok", note: `${photoCount} photos.` },
    );
  }
  const setCount = p.attributes.filter((a) => a.set).length;
  checks.push(
    p.attributes.length === 0 || setCount === 0
      ? {
          field: "Attributes",
          status: "missing",
          note: "No attributes (outdoor seating, Wi-Fi, parking, …) are set on the profile.",
        }
      : { field: "Attributes", status: "ok", note: `${setCount} attributes set.` },
  );
  return checks;
}
