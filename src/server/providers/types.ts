import type { BusinessLocation, BusinessProfile, GoogleAccount, PhotoItem, Review } from "@/types";

/**
 * OAuth tokens. Held server-side only (session cookie carries an opaque id);
 * the browser never sees an access or refresh token.
 */
export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds when the access token stops being accepted. */
  expiresAt: number;
  scope: string;
  tokenType: string;
}

export interface ConnectedAccount {
  account: GoogleAccount;
  tokens: TokenSet;
}

/**
 * The seam between the app's Google features and a data source.
 *
 * MockBusinessProfileProvider implements this fully with bundled sample data
 * so the whole app - UI, API endpoints, tests and demos - runs with zero
 * Google credentials. It is the default.
 *
 * GoogleBusinessProfileProvider implements the same interface against the
 * real Google OAuth 2.0 and Business Profile APIs. It is only selected when
 * USE_MOCK=false, and only then are Google credentials required.
 */
export interface BusinessProfileProvider {
  readonly name: "mock" | "google";
  /** True when this provider needs Google OAuth credentials configured. */
  readonly requiresCredentials: boolean;

  /** OAuth step 1: the URL the browser is sent to for consent. */
  buildAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
    redirectUri: string;
  }): string;

  /** OAuth step 2: swap the authorization code for tokens. */
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<ConnectedAccount>;

  listAccounts(tokens: TokenSet | null): Promise<GoogleAccount[]>;
  listLocations(accountId: string, tokens: TokenSet | null): Promise<BusinessLocation[]>;
  getProfile(locationId: string, tokens: TokenSet | null): Promise<BusinessProfile>;

  /** Individual recent reviews (up to 100) for the analysis pipeline. */
  getRecentReviews(locationId: string, tokens: TokenSet | null): Promise<Review[]>;

  /** Categorized photos for the analysis pipeline. */
  getRecentPhotos(locationId: string, tokens: TokenSet | null): Promise<PhotoItem[]>;

  /** Revoke access (real mode) or end the simulated session (mock). */
  revoke(tokens: TokenSet | null): Promise<void>;
}

/** The real provider was selected without the configuration it needs. */
export class ProviderNotConfiguredError extends Error {
  readonly code = "not_configured" as const;
  constructor(missing: string[]) {
    super(
      `Real Google access is selected but not configured; missing: ${missing.join(", ")}. ` +
        "Set them in .env.local or your host's environment (see README, \"Google sign-in setup\"), " +
        "or run without Google credentials: USE_MOCK=true for the fully simulated demo, or " +
        "GOOGLE_PROFILE_DATA=mock (the default) to keep business data mocked.",
    );
    this.name = "ProviderNotConfiguredError";
  }
}

/** An upstream (Google) API returned an error. */
export class ProviderApiError extends Error {
  readonly code = "provider_api_error" as const;
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderApiError";
  }
}

/** The requested resource does not exist in the provider. */
export class ProviderNotFoundError extends Error {
  readonly code = "not_found" as const;
  constructor(message: string) {
    super(message);
    this.name = "ProviderNotFoundError";
  }
}
