import { getClientKey, isRateLimited, rateLimitResponse } from "@/lib/api-rate-limit";

const EXTENSION_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Extension-Client-Id",
};

export function extensionJsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...EXTENSION_CORS_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export function extensionOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: EXTENSION_CORS_HEADERS,
  });
}

export function enforceExtensionRateLimit(
  request: Request,
  bucket: "extension-search" | "extension-status" | "extension-index"
) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey, bucket)) {
    return extensionJsonResponse(rateLimitResponse(bucket), { status: 429 });
  }
  return null;
}

export function parseVideoInput(searchParams: URLSearchParams, body?: Record<string, unknown>) {
  const videoId =
    (typeof body?.videoId === "string" ? body.videoId : undefined) ??
    searchParams.get("videoId") ??
    undefined;
  const url =
    (typeof body?.url === "string" ? body.url : undefined) ?? searchParams.get("url") ?? undefined;
  const query =
    (typeof body?.query === "string" ? body.query : undefined) ??
    searchParams.get("query") ??
    searchParams.get("q") ??
    undefined;

  return { videoId, url, query };
}
