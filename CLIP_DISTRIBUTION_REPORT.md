# Clip Distribution Report — Phase 10

Shareable moment cards and clip-ready **text** exports for distribution. This phase does **not** download, clip, rehost, or export YouTube video files.

## Legal / product boundary

| Allowed | Not implemented |
|---------|-----------------|
| Transcript quote excerpts | Video file download |
| Timestamp deep links to YouTube | In-app clipping / trimming |
| OG image cards (text layout) | Rehosted video or audio |
| iframe embed widgets linking out | Copyrighted clip generation |

Every export includes a footer: *transcript excerpt only · opens on YouTube · no video rehosting*.

## Share card types

| Card | OG route | Embed |
|------|----------|-------|
| Search result | `/api/og/search/[query]` | `/embed/search?q=` |
| Exact answer | `/api/og/answer/[query]` | `/embed/answer?q=` |
| Video moment | `/api/og/moment/[videoId]?q=&t=&snippet=` | `/embed/moment?videoId=&q=&t=&snippet=` |

Card layout shared via `lib/og-card-templates.tsx` (`OgCardShell`).

## Clip brief (`Copy clip brief`)

`lib/clip-distribution.ts` + `components/clip-brief-panel.tsx` generate copy-paste packs:

- **Title** — query or moment phrase
- **Quote** — verbatim transcript snippet
- **Timestamp URL** — YouTube `watch?v=` + `t=` link
- **Context** — one-sentence description of source
- **Reddit** title + body
- **Hacker News** title
- **X / Twitter** post (length-capped)
- **Tracked share URL** — canonical page with UTM params

## UTM / referrer tracking

Shared links append:

- `utm_source` — `reddit` | `hackernews` | `twitter` | `embed` | `copy` | `share`
- `utm_medium` — `social` | `embed` | `copy` | `card`
- `utm_campaign` — `search` | `answer` | `moment`
- `utm_content` — query or video id (truncated)

`ReferrerTracker` reads UTM params on landing and sends `referrer_visit` analytics with `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`. Document referrer still classified when UTM absent.

## UI surfaces

| Page | Distribution UI |
|------|-----------------|
| `/search/[query]` | `SearchSharePanel` — search + answer cards, clip briefs, embeds |
| `/search/[query]` | `SearchAnswerPanel` — best answer with YouTube jump |
| `/video/[id]/moment/[query]` | `MomentSharePanel` — moment card, clip brief, embed |

## Embed widget improvements

- **Search embed** — top moment quote + result counts + tracked CTA
- **Answer embed** — best answer block or fallback to search CTA
- **Moment embed** — quote snippet, channel, tracked moment/search links, legal footer

## Example clip brief

```
Title: what is rag
Quote: "RAG is retrieval augmented generation, which means you retrieve relevant documents..."
Timestamp URL: https://www.youtube.com/watch?v=VIDEO_ID&t=724
Context: Spoken answer excerpt for "what is rag" from Indexed Video Title at 12:04.
Landing page: https://www.youtubetimesearch.com/search/what-is-rag?utm_source=copy&utm_medium=copy&utm_campaign=answer&utm_content=what+is+rag

Transcript excerpt only. Opens on YouTube at the timestamp. This tool does not download, clip, or rehost video.
```

## Example Reddit body

```
Spoken answer excerpt for "what is mcp" from Lex Fridman Podcast at 42:10.

> "MCP stands for model context protocol and it's a way for models to talk to tools..."

YouTube: https://www.youtube.com/watch?v=...
More context: https://www.youtubetimesearch.com/search/what-is-mcp?utm_source=reddit&utm_medium=social&utm_campaign=answer

Transcript excerpt only. Opens on YouTube at the timestamp. This tool does not download, clip, or rehost video.
```

## Rollout checklist

1. Deploy Phase 10
2. Verify OG images render for search, answer, and moment routes
3. Copy clip brief from `/search/what-is-rag` and confirm quote matches transcript snippet
4. Open tracked link with `utm_source=reddit` and confirm analytics event in Supabase
5. Paste embed iframe on a test page — confirm CTA opens tracked landing URL
6. Confirm no UI offers video download or clip export

## Files added / updated

- `lib/clip-distribution.ts` — UTM, clip brief, social formats
- `lib/og-card-templates.tsx` — shared OG layout
- `app/api/og/answer/[query]/route.tsx`
- `app/api/og/moment/[videoId]/route.tsx`
- `app/embed/answer/page.tsx`
- `components/clip-brief-panel.tsx`
- `components/moment-share-panel.tsx`
- Updated: `search-share-panel`, embed search/moment, `referrer-tracker`, `og-urls`, `seo` moment metadata
