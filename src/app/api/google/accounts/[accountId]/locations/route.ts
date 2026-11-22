import { getBusinessProfileProvider, isMockMode } from "@/server/providers";
import { readSessionFromRequest } from "@/server/oauthSessions";
import { json, providerErrorResponse } from "@/server/apiUtils";

export const dynamic = "force-dynamic";

/** Lists the business locations under one Google account. */
export async function GET(
  request: Request,
  { params }: { params: { accountId: string } },
): Promise<Response> {
  const provider = getBusinessProfileProvider();
  const session = await readSessionFromRequest(request);
  if (!isMockMode() && !session) {
    return json(
      { error: "not_connected", message: "No Google session. Start the OAuth flow first." },
      401,
    );
  }
  try {
    const locations = await provider.listLocations(params.accountId, session?.tokens ?? null);
    return json(locations);
  } catch (err) {
    return providerErrorResponse(err);
  }
}
