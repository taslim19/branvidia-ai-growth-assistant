import {
  ProviderApiError,
  ProviderNotConfiguredError,
  ProviderNotFoundError,
} from "./providers/types";

/** Plain-Web JSON response helper (route handlers stay framework-thin). */
export function json(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Map provider errors to honest HTTP responses; anything else is a bug.
 *  Structural `code` checks (not instanceof) so transpiled Error subclasses
 *  behave the same everywhere. */
export function providerErrorResponse(err: unknown): Response {
  if (err instanceof Error) {
    const code = (err as { code?: string }).code;
    if (err instanceof ProviderNotConfiguredError || code === "not_configured") {
      return json({ error: "not_configured", message: err.message }, 503);
    }
    if (err instanceof ProviderNotFoundError || code === "not_found") {
      return json({ error: "not_found", message: err.message }, 404);
    }
    if (err instanceof ProviderApiError || code === "provider_api_error") {
      return json(
        {
          error: "provider_api_error",
          message: err.message,
          status: (err as { status?: number }).status ?? 502,
        },
        502,
      );
    }
  }
  throw err;
}
