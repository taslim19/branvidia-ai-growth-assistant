import type { BusinessLocation, BusinessProfile, GoogleAccount, PhotoItem, Review } from "@/types";
import { MOCK_PHOTOS } from "@/mock/photos";
import { MOCK_REVIEWS, MOCK_REVIEWS_KORAMANGALA } from "@/mock/reviews";
import { MOCK_GOOGLE_ACCOUNT, MOCK_LOCATIONS, MOCK_PROFILES } from "@/mock/businessProfile";
import { ProviderNotFoundError } from "./types";
import type { BusinessProfileProvider, ConnectedAccount, TokenSet } from "./types";

/** The one authorization code the simulated consent flow produces. */
export const MOCK_CONSENT_CODE = "mock-consent-code";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The complete mock provider, and the app's default. It speaks the exact same
 * interface as GoogleBusinessProfileProvider - including the OAuth handshake,
 * which it simulates by bouncing straight back to our own callback - so every
 * code path (UI, OAuth endpoints, data endpoints, tests and demos) works with
 * no Google credentials at all.
 */
export class MockBusinessProfileProvider implements BusinessProfileProvider {
  readonly name = "mock" as const;
  readonly requiresCredentials = false;

  /** Simulated consent: no Google round-trip, just our own callback URL. */
  buildAuthorizationUrl(input: { state: string; redirectUri: string }): string {
    const url = new URL(input.redirectUri);
    url.searchParams.set("code", MOCK_CONSENT_CODE);
    url.searchParams.set("state", input.state);
    return url.toString();
  }

  async exchangeCode(input: { code: string }): Promise<ConnectedAccount> {
    if (input.code !== MOCK_CONSENT_CODE) {
      throw new ProviderNotFoundError(
        "The mock provider only accepts the simulated consent code.",
      );
    }
    return {
      account: clone(MOCK_GOOGLE_ACCOUNT),
      tokens: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + 3_600_000,
        scope: "mock.business.readonly",
        tokenType: "Bearer",
      },
    };
  }

  async listAccounts(_tokens: TokenSet | null): Promise<GoogleAccount[]> {
    return [clone(MOCK_GOOGLE_ACCOUNT)];
  }

  async listLocations(
    _accountId: string,
    _tokens: TokenSet | null,
  ): Promise<BusinessLocation[]> {
    return clone(MOCK_LOCATIONS);
  }

  async getProfile(locationId: string, _tokens: TokenSet | null): Promise<BusinessProfile> {
    const profile = MOCK_PROFILES[locationId];
    if (!profile) {
      throw new ProviderNotFoundError(`Unknown mock location: ${locationId}`);
    }
    return clone(profile);
  }

  async getRecentReviews(locationId: string, _tokens: TokenSet | null): Promise<Review[]> {
    return clone(locationId === "loc-koramangala" ? MOCK_REVIEWS_KORAMANGALA : MOCK_REVIEWS);
  }

  async getRecentPhotos(_locationId: string, _tokens: TokenSet | null): Promise<PhotoItem[]> {
    return clone(MOCK_PHOTOS);
  }

  async revoke(_tokens: TokenSet | null): Promise<void> {
    // Nothing real is connected in mock mode.
  }
}
