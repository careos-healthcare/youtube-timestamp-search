import { normalizeText } from "@/lib/youtube";

export type EmbeddableSnippetMetadata = {
  type: "VideoMomentSnippet";
  version: "1";
  site: string;
  momentId: string;
  canonicalSlug: string;
  videoId: string;
  startSeconds: number;
  phrase: string;
  snippetExcerpt: string;
  youtubeUrl: string;
};

export type SemanticMomentCitations = {
  markdown: string;
  academic: string;
  quotePermalink: string;
  timestampCitation: string;
  embedSnippet: EmbeddableSnippetMetadata;
};

function escapeLatexish(value: string) {
  return value.replace(/"/g, '\\"');
}

export function buildSemanticMomentCitations(params: {
  siteUrl: string;
  momentId: string;
  canonicalSlug: string;
  videoId: string;
  startSeconds: number;
  phrase: string;
  snippet: string;
  youtubeUrl: string;
  videoTitle?: string;
  channelName?: string;
  publishedYear?: number;
}): SemanticMomentCitations {
  const title = params.videoTitle?.trim() || `YouTube video ${params.videoId}`;
  const channel = params.channelName?.trim() || "YouTube creator";
  const site = params.siteUrl.replace(/\/$/, "");
  const pageUrl = `${site}/moment/${params.momentId}/${params.canonicalSlug}`;
  const excerpt = normalizeText(params.snippet).slice(0, 420);
  const year = params.publishedYear ?? new Date().getUTCFullYear();

  const markdown = `[${title}](${pageUrl}) — “${normalizeText(params.phrase)}” (${params.youtubeUrl})`;

  const academic = `${channel}. *${escapeLatexish(title)}*. YouTube video (${year}). Retrieved from ${pageUrl}. Timestamp deep-link: ${params.youtubeUrl}.`;

  const timestampCitation = `${title}. ${params.youtubeUrl} (accessed ${year}). Quoted moment: “${normalizeText(params.phrase)}”.`;

  const embedSnippet: EmbeddableSnippetMetadata = {
    type: "VideoMomentSnippet",
    version: "1",
    site: params.siteUrl,
    momentId: params.momentId,
    canonicalSlug: params.canonicalSlug,
    videoId: params.videoId,
    startSeconds: params.startSeconds,
    phrase: normalizeText(params.phrase),
    snippetExcerpt: excerpt,
    youtubeUrl: params.youtubeUrl,
  };

  return {
    markdown,
    academic,
    quotePermalink: pageUrl,
    timestampCitation,
    embedSnippet,
  };
}
