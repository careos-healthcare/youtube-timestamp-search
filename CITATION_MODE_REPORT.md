# Citation mode (Phase 1) — public canonical moments

## Formats

| Format | Description | Primary API |
|--------|-------------|-------------|
| Markdown | Blockquote excerpt + bold title/channel + bullet links + retrieved date | `buildMarkdownMomentCitation` / `buildMomentCitationBundle().markdown` |
| Plain text | Quoted excerpt + labeled fields (title, channel, timestamp, phrase, URLs, retrieved) | `buildPlainTextMomentCitation` / `.plainText` |
| Academic-style | Single prose line (channel, phrase, video title, timestamp, URLs, accessed) | `buildAcademicMomentCitation` / `.academic` |
| HTML embed | `<iframe>` snippet pointing at the on-site embed player for the moment | `buildMomentHtmlEmbedSnippet` / `.htmlEmbed` |
| Timestamp URL | Materialized YouTube watch URL with offset | `buildMomentTimestampUrl` / `.timestampUrl` |
| Canonical moment URL | Stable `/moment/[id]/[slug]` URL on this site | `buildCanonicalMomentUrl` / `.canonicalMomentUrl` |
| YouTube timestamp URL | Same as timestamp URL for Phase 1 (playback starts at the matched line) | `buildYouTubeTimestampMomentUrl` / `.youtubeTimestampUrl` |

Bundle builder: `buildMomentCitationBundle(siteUrl, input)` in `lib/citations/moment-citation.ts`. Thin helpers live in `lib/citations/index.ts`.

**Included in every citation:** transcript excerpt (quote), video title, channel/creator (fallback: “YouTube creator”), display timestamp string, search phrase, YouTube URL, canonical moment URL, and **retrieved/accessed date** (UTC `YYYY-MM-DD`). On the client, Markdown / plain text / academic blocks refresh the date at render time before copy so “today” stays current without re-fetching the page.

## Sample citations (illustrative)

**Markdown (truncated excerpt in blockquote):**

```markdown
> First few words of the transcript line…

**Talk title** · Channel name · `12:34`

**Moment:** “exact phrase”

- **Canonical:** https://example.com/moment/abc123/slug-here
- **YouTube:** https://www.youtube.com/watch?v=…&t=…
- **Retrieved:** 2026-05-15
```

**Plain text:** block quote + labeled `Title`, `Channel`, `Timestamp`, `Phrase`, `Canonical moment`, `YouTube (timestamped)`, `Retrieved`.

**Academic-style:** one sentence citing channel, phrase, italicized video title, timestamp, both URLs, and “Accessed …”.

**HTML embed:** iframe `src` from `buildEmbedMomentUrl` (same widget as share panel embed).

## Routes / files touched

- **Page:** `app/moment/[id]/[slug]/page.tsx` — builds `citationBundle` server-side; renders `MomentCitationPanel` with `citeSectionId="cite-this-moment"`; passes `citationSectionId` into `MomentSharePanel` for an anchor link (no duplicated citation UI).
- **UI:** `components/moment-citation-panel.tsx`, `components/moment-share-panel.tsx`
- **Citations lib:** `lib/citations/moment-citation.ts`, `lib/citations/index.ts`
- **Analytics types:** `lib/analytics.ts`
- **Structured data:** `lib/site-structured-data.ts` — optional `Quotation` node in `@graph` when `snippet` is non-empty (does not replace `WebPage` / `VideoObject` / `BreadcrumbList`).

## Analytics events

| Event | When | Payload |
|-------|------|---------|
| `moment_citation_copy` | User copies Markdown, plain text, or academic | `momentId`, `phrase`, `videoId`, `format` (`markdown` \| `plainText` \| `academic`) |
| `moment_embed_copy` | User copies HTML embed | `momentId`, `phrase`, `videoId`, `format`: `htmlEmbed` |
| `moment_youtube_citation_click` | User clicks “Open on YouTube at timestamp” in citation panel | `momentId`, `phrase`, `videoId`, `format`: `youtube_timestamp` |

All go through `trackPersistentEvent` (existing analytics pipeline).

## Remaining risks / limitations

1. **Not legal bibliography output** — “Academic-style” is a convenience string, not a specific style guide (APA/MLA/Chicago).
2. **YouTube URL drift** — Timestamp URLs are materialized at page build / request time; if the transcript index shifts, links could point to a slightly different span until the page is regenerated or re-hit.
3. **SSR vs client date** — Server-rendered JSON-LD and OG metadata use generation-time data; citation copy UI refreshes access date on the client only.
4. **Clipboard API** — Copy buttons require a secure context and permission; failures are swallowed (button shows no persistent error state).
5. **Quotation schema** — We expose transcript text as `Quotation`; we do not claim publisher or formal `Citation`/`ScholarlyArticle` typing beyond that.
