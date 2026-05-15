# Product growth loop report

This document summarizes the consumer-first growth loops added for **YouTube Time Search** (“Google for spoken video knowledge”): retention, saved clips, viral sharing, empty-search recovery, analytics events, and QA.

## 1. Search retention loop

- **Recent searches** (`localStorage`, key `youtube-timestamp-search:recent-searches`): last 12 queries, deduped, device-only.
- **UI**: `RecentSearchesPanel` on homepage and search landing (below the search form).
- **Session depth** (`sessionStorage`): counts for index searches per session, timestamp clicks (YouTube opens from timestamp CTAs). Milestones fire at configured thresholds.
- **Continue exploring**: `ContinueExploringSection` on search pages — merges synonym expansions, related phrases, “people also searched”, and related intent groups; tracks `continue_exploring_click`.
- **Email capture**: after **3 session searches** OR **2 timestamp clicks**, `EmailDigestPrompt` offers a weekly digest; posts to `/api/waitlist` with `interest: "weekly_digest"` (validated server-side). Dismissal is session-scoped; submit persists opt-out for the prompt.

## 2. Saved clips / bookmarks

- **Storage**: `localStorage` (`youtube-timestamp-search:saved-clips`), max 200 items. Fields: query, videoId, title, channel, timestamp, snippet, YouTube URL, moment page URL (absolute at save time), `createdAt`.
- **UI**: `SaveMomentButton` on search result cards, best-answer panel, and per-row transcript moment results.
- **Page**: `/saved` (`SavedClipsPageClient`) with copy-all as markdown and copy timestamp links. Footer + homepage link to discovery; `/saved` is `noindex` (private list).

## 3. Sharing surfaces

- **Viral formats**: `ViralShareBlock` — quote + timestamp, X, Reddit, LinkedIn, markdown citation, quote-card image URL (`/api/og/quote`), embed iframe snippet.
- **Placement**: search result cards, answer panel, `SearchSharePanel` (top moment), `MomentSharePanel` (plus explicit quote-card copy row).
- **Best moment**: when answer confidence is **high**, a **Best moment** pill appears beside **Best answer**.
- **Legal**: copy actions reference YouTube URLs and transcript/moment pages only — no download/rehost claims.

## 4. Empty-search recovery

- **Library**: `lib/search/query-expansion.ts` — normalization (e.g. hyphens → spaces), synonym buckets (ai agents, rag, system design, startup advice, mcp), related phrases from `getRelatedSearchPhrases`, trending seeds from priority queries.
- **Engine**: `lib/search/hybrid-search-recovery.ts` — sequential attempts: exact → normalized → expansions → related topics → trending seeds until hits exist.
- **API**: `GET/POST /api/search-index` returns `appliedQuery`, `recoveryPath`, `suggestedSearches`, `trendingAlternatives`, etc.
- **Search landing**: `getSearchLandingData` uses recovery for broad + full + keyword-rescue paths; `searchRecovery` on `SearchLandingData` carries `appliedQuery`, `path`, and `explorePhrases`.
- **UI**: alternate-query banner when results come from a different applied query; `SearchEmptyRecovery` when there are zero moments (not timeout/error) with closest matches, related searches, paste-video and index/trending CTAs; transcript index search client shows the same patterns.
- **Analytics**: `empty_search_recovered` when the transcript index empty state shows alternative chips (index search UI).

## 5. Events added (`lib/analytics.ts`)

| Event | Purpose |
| --- | --- |
| `recent_search_click` | User chose a recent search chip |
| `continue_exploring_click` | Related / intent / chip navigation |
| `search_depth_milestone` | Session thresholds (searches 1/2/3/5, timestamp clicks 1/2/5) |
| `saved_clip` | Local save succeeded |
| `email_capture_prompt_shown` | Digest CTA surfaced |
| `email_capture_submit` | Waitlist submit for digest |
| `empty_search_recovered` | Empty index UX with alternatives shown |

Existing events (`search_query`, `youtube_open`, `indexed_transcript_search`, etc.) remain unchanged.

## 6. Public trending / discovery

- **Route**: `/trending` — trending searches (`getTrendingSearches`), local saved strip (`TrendingSavedStrip`), newest indexed videos (`getLatestIndexedVideos`), authority topic links.
- **Sitemap**: `/trending` included; `/saved` omitted (noindex).
- **Links**: Homepage hub link; footer; thin-content and empty-recovery CTAs.

## 7. Manual QA checklist

1. **Recent searches**: run several searches from `/search/...`; confirm homepage + search page show chips; new tab respects device-only storage.
2. **Continue exploring**: click chips; verify navigation and network `/api/analytics/event` payloads (optional).
3. **Session depth**: in one session, perform 3 searches or 2 YouTube timestamp opens from search/transcript UI; digest CTA appears; dismiss + refresh behavior; submit email hits `/api/waitlist` with `weekly_digest`.
4. **Saved clips**: save from search card, answer panel, transcript row; `/saved` lists; markdown + links copy; remove works.
5. **Viral share**: each format copies expected text; quote-card URL loads OG image; embed snippet is iframe-only.
6. **Empty / recovery**: query with no corpus hit (or `ai-agents`-style) returns non-zero when expansion hits; zero-result page shows recovery module; index search API returns `suggestedSearches` / `trendingAlternatives`.
7. **Regression**: `/search/[query]` JSON-LD still renders; canonical unchanged; build completes without extra heavy server work at build time (`getTrendingSearches` build path uses seeds).

## 8. Automated validation

- Run: `npm run validate:query-expansion` (synonym + recovery ordering smoke test).
