import {
  enforceExtensionRateLimit,
  extensionJsonResponse,
  extensionOptionsResponse,
  parseVideoInput,
} from "@/lib/extension-api-http";
import {
  extensionErrorResponse,
  resolveExtensionVideoId,
  searchExtensionVideo,
  ExtensionApiError,
} from "@/lib/extension-api";
import { trackServerEvent } from "@/lib/analytics";

export async function OPTIONS() {
  return extensionOptionsResponse();
}

export async function GET(request: Request) {
  const limited = enforceExtensionRateLimit(request, "extension-search");
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const { videoId, url, query } = parseVideoInput(searchParams);

  const resolvedVideoId = resolveExtensionVideoId({ videoId, url });
  if (!resolvedVideoId) {
    return extensionJsonResponse(
      { code: "invalid_video", error: "Provide a valid videoId or YouTube URL." },
      { status: 400 }
    );
  }

  if (!query?.trim()) {
    return extensionJsonResponse(
      { code: "missing_query", error: "A search query is required." },
      { status: 400 }
    );
  }

  try {
    const result = await searchExtensionVideo(resolvedVideoId, query);
    trackServerEvent("extension_video_search", {
      videoId: resolvedVideoId,
      queryLength: query.length,
      resultCount: result.resultCount,
      indexed: result.indexed,
    });
    return extensionJsonResponse(result);
  } catch (error) {
    const { status, body } = extensionErrorResponse(error);
    return extensionJsonResponse(body, { status });
  }
}

export async function POST(request: Request) {
  const limited = enforceExtensionRateLimit(request, "extension-search");
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { videoId, url, query } = parseVideoInput(new URLSearchParams(), body);

    const resolvedVideoId = resolveExtensionVideoId({ videoId, url });
    if (!resolvedVideoId) {
      throw new ExtensionApiError("invalid_video", "Provide a valid videoId or YouTube URL.", 400);
    }

    if (!query?.trim()) {
      throw new ExtensionApiError("missing_query", "A search query is required.", 400);
    }

    const result = await searchExtensionVideo(resolvedVideoId, query);
    trackServerEvent("extension_video_search", {
      videoId: resolvedVideoId,
      queryLength: query.length,
      resultCount: result.resultCount,
      indexed: result.indexed,
    });
    return extensionJsonResponse(result);
  } catch (error) {
    const { status, body } = extensionErrorResponse(error);
    return extensionJsonResponse(body, { status });
  }
}
