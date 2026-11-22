import { getBusinessProfileProvider } from "@/server/providers";
import {
  destroySession,
  readSessionFromRequest,
  sessionCookieHeader,
} from "@/server/oauthSessions";
import { json, providerErrorResponse } from "@/server/apiUtils";
import { isAllowedOrigin, originDeniedResponse } from "@/server/security/originCheck";

export const dynamic = "force-dynamic";

/**
 * Ends the Google connection: revokes the token (real mode), deletes the
 * stored server-side session and clears the cookie. Always succeeds in mock
 * mode.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) return originDeniedResponse();
  const provider = getBusinessProfileProvider();
  const session = await readSessionFromRequest(request);
  try {
    if (session) {
      await provider.revoke(session.tokens);
      await destroySession(session.id);
    }
  } catch (err) {
    return providerErrorResponse(err);
  }
  const secure = new URL(request.url).protocol === "https:";
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookieHeader(null, secure) });
}
