import { getGoogleSignInProvider } from "@/server/providers";
import { newOAuthState, newPkcePair, safeReturnTo } from "@/server/oauthSessions";
import { json, providerErrorResponse } from "@/server/apiUtils";

export const dynamic = "force-dynamic";

/**
 * OAuth step 1. Redirects the browser to the provider's consent URL.
 * Mock mode: the URL is our own callback with a simulated code, so the whole
 * handshake works with no Google credentials. Real mode: Google's consent
 * screen, requiring GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (HTTP 503 without).
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const provider = getGoogleSignInProvider();
  const { verifier, challenge } = newPkcePair();
  const state = await newOAuthState(verifier, safeReturnTo(url.searchParams.get("returnTo")));
  try {
    const redirectUri = new URL("/api/oauth/google/callback", url.origin).toString();
    const authorizationUrl = provider.buildAuthorizationUrl({ state, codeChallenge: challenge, redirectUri });
    return Response.redirect(authorizationUrl, 302);
  } catch (err) {
    return providerErrorResponse(err);
  }
}

// A POST is never meaningful here, but answer it instead of hanging.
export async function POST(): Promise<Response> {
  return json({ error: "method_not_allowed", message: "Use GET to start the OAuth flow." }, 405);
}
