import { getBusinessProfileProvider, isMockMode } from "@/server/providers";
import { readSessionFromRequest } from "@/server/oauthSessions";
import { json, providerErrorResponse } from "@/server/apiUtils";

export const dynamic = "force-dynamic";

/** Returns the full BusinessProfile for one location. */
export async function GET(
  request: Request,
  { params }: { params: { locationId: string } },
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
    const profile = await provider.getProfile(params.locationId, session?.tokens ?? null);
    return json(profile);
  } catch (err) {
    return providerErrorResponse(err);
  }
}
