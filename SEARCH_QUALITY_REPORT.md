# Search Quality Report — Phase 8 Hybrid Retrieval

Generated for Phase 8 semantic + hybrid retrieval rollout.

## Summary

Search now runs through a layered engine:

1. **Keyword provider** — existing Supabase FTS/trigram RPC and local fallback scan (unchanged behavior at the base layer).
2. **Semantic provider** — optional vector RPC (`search_segment_embeddings`) with graceful no-op when embeddings are not configured.
3. **Hybrid ranking** — reranks keyword (+ optional semantic) hits with phrase boost, metadata boost, diversity, and duplicate suppression.

Default production mode: **`hybrid-keyword`** (hybrid on, semantic off until embeddings are populated).

## Config flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `HYBRID_SEARCH_ENABLED` | `true` | Master switch for hybrid reranking |
| `SEMANTIC_SEARCH_ENABLED` | `false` | Enables semantic provider when embeddings exist |
| `SEMANTIC_EMBEDDING_PROVIDER` | — | `openai` or `supabase` |
| `OPENAI_API_KEY` | — | Required for OpenAI embedding generation (future worker) |
| `SEMANTIC_EMBEDDING_MODEL` | `text-embedding-3-small` | Stored on `segment_embeddings.embedding_model` |
| `SEMANTIC_LEXICAL_PLACEHOLDER` | `false` | Dev-only lexical similarity placeholder |
| `HYBRID_EXACT_PHRASE_BOOST` | `15` | Boost when snippet contains full query phrase |
| `HYBRID_SEMANTIC_WEIGHT` | `20` | Multiplier for semantic similarity |
| `HYBRID_TITLE_METADATA_BOOST` | `6` | Boost when query tokens appear in title/topic/category |
| `HYBRID_MAX_MOMENTS_PER_VIDEO` | `2` | Video diversity cap |
| `HYBRID_MAX_MOMENTS_PER_CHANNEL` | `6` | Creator/channel diversity cap |
| `HYBRID_MIN_TIMESTAMP_GAP_SECONDS` | `45` | Timestamp spread within a video |

Set `HYBRID_SEARCH_ENABLED=false` to restore keyword-only ordering instantly without code changes.

## Before vs after examples

### Example A — exact phrase clustering

**Query:** `compound interest explained`

| Mode | Top moment behavior |
|------|---------------------|
| **Before (keyword)** | Multiple hits from the same video within 10–20s, sorted only by raw term frequency |
| **After (hybrid)** | Exact phrase matches boosted (+15); max 2 moments per video; timestamps spaced ≥45s; near-duplicate snippets collapsed |

### Example B — metadata-aware ranking

**Query:** `naval ravikant happiness`

| Mode | Top moment behavior |
|------|---------------------|
| **Before** | Segment text match only; title/channel metadata ignored in ranking |
| **After** | Videos whose title/channel/topic contain query tokens receive metadata boost; channel diversity prevents one creator flooding the page |

### Example C — semantic path (when configured)

**Query:** `how to stay motivated long term`

| Mode | Top moment behavior |
|------|---------------------|
| **Before** | Misses paraphrased segments that do not contain literal query tokens |
| **After (semantic on + embeddings populated)** | `search_segment_embeddings` adds vector neighbors; hybrid score blends keyword + similarity; falls back to keyword-only if RPC returns zero rows |

### Example D — related intent

**Query:** `stoicism daily practice`

| Surface | Before | After |
|---------|--------|-------|
| Search landing | Static corpus related phrases only | **People also searched** merges analytics co-search signals with corpus seeds; intent groups for topics and popular searches |

## API response shape

`GET /api/search-index?query=...` now includes:

```json
{
  "searchMode": "hybrid-keyword",
  "diagnostics": {
    "mode": "hybrid-keyword",
    "keywordResultCount": 18,
    "semanticResultCount": 0,
    "hybridApplied": true,
    "semanticFallback": false
  }
}
```

## Schema

Migration `006_segment_embeddings.sql` adds:

- `segment_embeddings` table (optional `vector(1536)` column + metadata)
- `search_segment_embeddings` RPC placeholder (returns rows only after embeddings exist)

## Rollout checklist

1. Deploy code with defaults (`HYBRID_SEARCH_ENABLED=true`, `SEMANTIC_SEARCH_ENABLED=false`).
2. Run `supabase db push` for migration `006`.
3. Verify `/search/[query]` and `/api/search-index` show `searchMode: hybrid-keyword`.
4. When embedding worker is ready, backfill `segment_embeddings` and set `SEMANTIC_SEARCH_ENABLED=true`.
5. Compare diagnostics `semanticResultCount` and spot-check `/admin/validation` search quality feedback.

## Files touched

- `lib/search/*` — config, keyword provider, semantic provider, hybrid ranking, hybrid engine, related intent
- `lib/search-landing-engine.ts` — hybrid moments + people also searched
- `lib/transcript-cache.ts` — `searchCachedTranscripts` delegates to hybrid engine
- `app/api/search-index/route.ts` — diagnostics in JSON
- `app/video/[videoId]/moment/[query]/page.tsx` — per-video hybrid ranking
- `components/search-landing-results.tsx` — People also searched section
- `supabase/migrations/006_segment_embeddings.sql`
