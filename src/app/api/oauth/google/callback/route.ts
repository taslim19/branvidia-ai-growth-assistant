import { getBusinessProfileProvider } from "@/server/providers";
import {
  createSession,
  sessionCookieHeader,
  takeOAuthState,
} from "@/server/oauthSessions";
import { json, providerErrorResponse } from "@/server/apiUtils";

export const dynamic = "force-dynamic";

function redirectWithError(origin: string, returnTo: string | null, reason: string): Response {
  const target = new URL(returnTo ?? "/connect/google", origin);
  target.searchParams.set("oauth_error", reason);
  return Response.redirect(target.toString(), 302);
}

/**
 * OAuth step 2. Validates the one-time state, exchanges the code for tokens
 * (real mode) or completes the simulated handshake (mock mode), stores the
 * session server-side and sets an opaque HttpOnly cookie. Tokens never reach
 * the browser.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const provider = getBusinessProfileProvider();
  const state = url.searchParams.get("state") ?? "";
  const pending = await takeOAuthState(state);

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    // The user declined (or Google errored) on the consent screen.
    return redirectWithError(url.origin, pending?.returnTo ?? null, oauthError);
  }
  if (!pending) {
    return json(
      {
        error: "invalid_state",
        message: "Unknown or expired OAuth state. Start the connection again.",
      },
      400,
    );
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return redirectWithError(url.origin, pending.returnTo, "missing_code");
  }

  try {
    const redirectUri = new URL("/api/oauth/google/callback", url.origin).toString();
    const { account, tokens } = await provider.exchangeCode({
      code,
      codeVerifier: pending.verifier,
      redirectUri,
    });
    const session = await createSession(account, tokens);
    const target = new URL(pending.returnTo ?? "/connect/google", url.origin);
    target.searchParams.set("connected", "1");
    // Not Response.redirect(): its headers are immutable, and we must set the cookie.
    return new Response(null, {
      status: 302,
      headers: {
        location: target.toString(),
        "Set-Cookie": sessionCookieHeader(session.id, url.protocol === "https:"),
      },
    });
  } catch (err) {
    return providerErrorResponse(err);
  }
}
