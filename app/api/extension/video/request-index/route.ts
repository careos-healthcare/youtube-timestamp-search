import {
  enforceExtensionRateLimit,
  extensionJsonResponse,
  extensionOptionsResponse,
  parseVideoInput,
} from "@/lib/extension-api-http";
import {
  extensionErrorResponse,
  requestExtensionVideoIndex,
  resolveExtensionVideoId,
  ExtensionApiError,
} from "@/lib/extension-api";
import { trackServerEvent } from "@/lib/analytics";

export async function OPTIONS() {
  return extensionOptionsResponse();
}

export async function POST(request: Request) {
  const limited = enforceExtensionRateLimit(request, "extension-index");
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { videoId, url } = parseVideoInput(new URLSearchParams(), body);

    const resolvedVideoId = resolveExtensionVideoId({ videoId, url });
    if (!resolvedVideoId) {
      throw new ExtensionApiError("invalid_video", "Provide a valid videoId or YouTube URL.", 400);
    }

    const result = await requestExtensionVideoIndex(
      resolvedVideoId,
      typeof url === "string" ? url : undefined
    );

    trackServerEvent("extension_index_request", {
      videoId: resolvedVideoId,
      status: result.status,
    });

    return extensionJsonResponse(result, {
      status: result.status === "queued" ? 202 : 200,
    });
  } catch (error) {
    const { status, body } = extensionErrorResponse(error);
    return extensionJsonResponse(body, { status });
  }
}
