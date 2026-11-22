import { getBusinessProfileProvider, isMockMode } from "@/server/providers";
import { readSessionFromRequest } from "@/server/oauthSessions";
import { json, providerErrorResponse } from "@/server/apiUtils";
import { isAllowedOrigin, originDeniedResponse } from "@/server/security/originCheck";

export const dynamic = "force-dynamic";

/**
 * Lists the Google accounts the connected user can pick from.
 * Mock mode: the sample account, no session or credentials needed.
 * Real mode: the Business Profile accounts of the connected user, 401 when no
 * OAuth session exists (the client then starts /api/oauth/google/start).
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request)) return originDeniedResponse();
  const provider = getBusinessProfileProvider();
  const session = await readSessionFromRequest(request);
  if (!isMockMode() && !session) {
    return json(
      { error: "not_connected", message: "No Google session. Start the OAuth flow first." },
      401,
    );
  }
  try {
    const accounts = await provider.listAccounts(session?.tokens ?? null);
    const email = session?.account.email;
    return json({ accounts: accounts.map((a) => (email ? { ...a, email } : a)) });
  } catch (err) {
    return providerErrorResponse(err);
  }
}
