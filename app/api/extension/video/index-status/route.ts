import {
  enforceExtensionRateLimit,
  extensionJsonResponse,
  extensionOptionsResponse,
  parseVideoInput,
} from "@/lib/extension-api-http";
import { extensionErrorResponse, getExtensionVideoIndexStatus, resolveExtensionVideoId } from "@/lib/extension-api";

export async function OPTIONS() {
  return extensionOptionsResponse();
}

export async function GET(request: Request) {
  const limited = enforceExtensionRateLimit(request, "extension-status");
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const { videoId, url } = parseVideoInput(searchParams);

  const resolvedVideoId = resolveExtensionVideoId({ videoId, url });
  if (!resolvedVideoId) {
    return extensionJsonResponse(
      { code: "invalid_video", error: "Provide a valid videoId or YouTube URL." },
      { status: 400 }
    );
  }

  try {
    const status = await getExtensionVideoIndexStatus(resolvedVideoId);
    return extensionJsonResponse(status);
  } catch (error) {
    const { status, body } = extensionErrorResponse(error);
    return extensionJsonResponse(body, { status });
  }
}
