import { buildSearchPath, getSiteUrl } from "@/lib/seo";

export type ViralShareContext = {
  query: string;
  videoTitle: string;
  channelName?: string;
  snippet: string;
  timestampLabel: string;
  youtubeUrl: string;
  momentPageUrl: string;
  videoId: string;
};

export function buildQuotePlusTimestamp(ctx: ViralShareContext): string {
  const channel = ctx.channelName ? ` — ${ctx.channelName}` : "";
  return `“${ctx.snippet.slice(0, 220)}${ctx.snippet.length > 220 ? "…" : ""}” (${ctx.timestampLabel})${channel}\n${ctx.youtubeUrl}`;
}

export function buildMarkdownCitation(ctx: ViralShareContext): string {
  const channel = ctx.channelName ? ` *${ctx.channelName}*` : "";
  return `> “${ctx.snippet.replace(/\n+/g, " ").slice(0, 280)}”  \n> — ${ctx.videoTitle}${channel}, ${ctx.timestampLabel}  \n> [YouTube](${ctx.youtubeUrl}) · [Moment](${ctx.momentPageUrl})`;
}

export function buildXPostText(ctx: ViralShareContext): string {
  const core = `Spoken moment on “${ctx.query}”:\n\n${buildQuotePlusTimestamp(ctx)}`;
  return core.length > 260 ? `${core.slice(0, 240)}…\n${ctx.momentPageUrl}` : `${core}\n\n${ctx.momentPageUrl}`;
}

export function buildRedditPostText(ctx: ViralShareContext): string {
  return [
    `Timestamped transcript moment for “${ctx.query}” (links only — plays on YouTube):`,
    "",
    buildMarkdownCitation(ctx),
    "",
    `Search across more indexed talks: ${getSiteUrl()}${buildSearchPath(ctx.query)}`,
  ].join("\n");
}

export function buildLinkedInPostText(ctx: ViralShareContext): string {
  return [
    `Useful spoken moment while researching “${ctx.query}”.`,
    "",
    buildQuotePlusTimestamp(ctx),
    "",
    `More indexed moments: ${ctx.momentPageUrl}`,
  ].join("\n");
}
