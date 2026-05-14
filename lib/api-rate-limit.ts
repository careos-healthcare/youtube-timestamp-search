type RateLimitBucket = "extension-search" | "extension-status" | "extension-index";

const RATE_LIMIT_WINDOW_MS = 60_000;
const LIMITS: Record<RateLimitBucket, number> = {
  "extension-search": 30,
  "extension-status": 60,
  "extension-index": 10,
};

const requestLogByClient = new Map<string, number[]>();

export function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const extensionClient = request.headers.get("x-extension-client-id")?.trim();
  return extensionClient || forwardedFor || realIp || "unknown";
}

export function isRateLimited(clientKey: string, bucket: RateLimitBucket) {
  const now = Date.now();
  const mapKey = `${bucket}:${clientKey}`;
  const maxRequests = LIMITS[bucket];
  const recentRequests = (requestLogByClient.get(mapKey) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentRequests.length >= maxRequests) {
    requestLogByClient.set(mapKey, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestLogByClient.set(mapKey, recentRequests);
  return false;
}

export function rateLimitResponse(bucket: RateLimitBucket) {
  return {
    code: "rate_limited" as const,
    error: "Too many extension API requests.",
    detail: `Retry after a short wait. Bucket: ${bucket}.`,
  };
}
