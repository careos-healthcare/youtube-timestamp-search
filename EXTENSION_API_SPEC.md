# Extension API Spec — Phase 11

Browser-extension-ready HTTP API (no Chrome extension shipped in this phase). All endpoints are **read/search/index-request only** — no video download or rehosting.

Base URL (production): `https://www.youtubetimesearch.com`

## Authentication

Public read/search endpoints use IP + optional `X-Extension-Client-Id` header for rate-limit bucketing. No API key required in Phase 11.

## Rate limits (per client per minute)

| Endpoint | Limit |
|----------|-------|
| `video/search` | 30 |
| `video/index-status` | 60 |
| `video/request-index` | 10 |

429 response:

```json
{
  "code": "rate_limited",
  "error": "Too many extension API requests.",
  "detail": "Retry after a short wait. Bucket: extension-search."
}
```

## CORS

`Access-Control-Allow-Origin: *` on `/api/extension/*` for future extension content scripts calling the API from `youtube.com` pages (via background worker proxy recommended).

---

## 1. Search within one video

**`GET /api/extension/video/search`**

Query params:

| Param | Required | Description |
|-------|----------|-------------|
| `videoId` | one of videoId/url | YouTube video ID |
| `url` | one of videoId/url | Full YouTube watch URL |
| `query` or `q` | yes | Phrase to find in transcript |

**`POST /api/extension/video/search`**

```json
{
  "videoId": "dQw4w9WgXcQ",
  "query": "never gonna give you up"
}
```

### Success `200`

```json
{
  "videoId": "dQw4w9WgXcQ",
  "query": "never gonna give you up",
  "indexed": true,
  "source": "cache",
  "title": "Rick Astley - Never Gonna Give You Up",
  "channelName": "Rick Astley",
  "resultCount": 2,
  "moments": [
    {
      "startSeconds": 43,
      "timestamp": "0:43",
      "snippet": "We're no strangers to love...",
      "confidence": 0.86,
      "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s",
      "momentPageUrl": "https://www.youtubetimesearch.com/video/dQw4w9WgXcQ/moment/never-gonna-give-you-up"
    }
  ]
}
```

| Field | Notes |
|-------|-------|
| `confidence` | 0–1 hybrid rank score (term coverage + phrase match + diversity) |
| `source` | `cache` if transcript was already indexed; `live` if fetched on demand |
| `youtubeUrl` | Deep link only — opens YouTube, no file export |

### Errors

| Status | code | When |
|--------|------|------|
| 400 | `invalid_video` | Bad/missing videoId or URL |
| 400 | `missing_query` | Empty query |
| 404 | `transcript_unavailable` | Private/unavailable video |
| 422 | `transcript_unavailable` | Captions disabled |
| 429 | `rate_limited` | Abuse protection |
| 500 | `search_failed` | Unexpected failure |

---

## 2. Check if video is indexed

**`GET /api/extension/video/index-status`**

Query: `videoId` or `url`

### Success `200` (indexed)

```json
{
  "videoId": "abc123XYZ",
  "indexed": true,
  "segmentCount": 842,
  "title": "Example lecture",
  "channelName": "Example Channel",
  "fetchedAt": "2026-05-01T12:00:00.000Z",
  "indexPending": false
}
```

### Success `200` (not indexed)

```json
{
  "videoId": "abc123XYZ",
  "indexed": false,
  "segmentCount": 0,
  "indexPending": false
}
```

`indexPending: true` when a job exists in the ingestion queue.

---

## 3. Request indexing

**`POST /api/extension/video/request-index`**

```json
{
  "url": "https://www.youtube.com/watch?v=abc123XYZ"
}
```

### Responses

| Status | status field | Meaning |
|--------|--------------|---------|
| 200 | `already_indexed` | Transcript already searchable |
| 200 | `already_queued` | Job already in ingestion queue |
| 202 | `queued` | New job enqueued |

```json
{
  "videoId": "abc123XYZ",
  "status": "queued",
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message": "Video queued for transcript indexing."
}
```

Indexing is asynchronous — poll `index-status` until `indexed: true`.

---

## Curl examples

See `scripts/extension-api-examples.sh` or run:

```bash
npm run test:extension-api
```

```bash
# Index status
curl -s "http://localhost:3000/api/extension/video/index-status?videoId=dQw4w9WgXcQ" | jq

# Search (GET)
curl -s "http://localhost:3000/api/extension/video/search?videoId=dQw4w9WgXcQ&query=never" | jq

# Search (POST)
curl -s -X POST http://localhost:3000/api/extension/video/search \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","query":"give you up"}' | jq

# Request indexing
curl -s -X POST http://localhost:3000/api/extension/video/request-index \
  -H "Content-Type: application/json" \
  -d '{"videoId":"NEW_VIDEO_ID"}' | jq
```

## Future Chrome extension flow

1. Content script reads `videoId` from `youtube.com/watch?v=`.
2. Background worker calls `index-status`.
3. If not indexed → `request-index` → poll status.
4. On user search → `video/search` → render moment list with `youtubeUrl` jumps.
5. Optional: open `momentPageUrl` on youtubetimesearch.com for shareable landing.

## Files

- `lib/extension-api.ts` — core logic
- `lib/extension-api-http.ts` — CORS + rate limit helpers
- `lib/api-rate-limit.ts` — shared limiter
- `app/api/extension/video/search/route.ts`
- `app/api/extension/video/index-status/route.ts`
- `app/api/extension/video/request-index/route.ts`
- `scripts/test-extension-api.ts` — unit checks
- `scripts/extension-api-examples.sh` — curl smoke tests
