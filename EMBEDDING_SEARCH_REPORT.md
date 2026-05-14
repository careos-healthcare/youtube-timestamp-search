# Embedding Search Report — Phase 12

Real embedding infrastructure for semantic retrieval, with **keyword/hybrid fallback preserved by default**.

## Architecture

| Layer | File | Role |
|-------|------|------|
| Provider | `lib/search/embedding-provider.ts` | OpenAI embeddings (`OPENAI_API_KEY`) |
| Store | `lib/search/embedding-store.ts` | Supabase `segment_embeddings` read/write + vector RPC |
| Semantic | `lib/search/semantic-search-provider.ts` | Query embed → RPC → `SemanticSearchHit[]` |
| Hybrid | `lib/search/hybrid-search-engine.ts` | Keyword + semantic merge with fallback diagnostics |
| Backfill | `scripts/backfill-segment-embeddings.ts` | Batch embed indexed transcript segments |

Production default: `SEMANTIC_SEARCH_ENABLED=false` — site works without embeddings.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | — | Required for embedding generation/search |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `SEMANTIC_EMBEDDING_MODEL` | fallback alias | Legacy Phase 8 name |
| `EMBEDDING_DIMENSIONS` | `1536` | Vector size for `text-embedding-3-*` |
| `SEMANTIC_SEARCH_ENABLED` | `false` | Enable semantic leg of hybrid search |
| `HYBRID_SEARCH_ENABLED` | `true` | Keyword reranking (independent of embeddings) |
| `HYBRID_MIN_SEMANTIC_SIMILARITY` | `0.25` | RPC similarity floor |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Backfill + vector RPC |

## Migration steps

1. Apply migrations through `007_upgrade_segment_embedding_search.sql`:
   ```bash
   supabase db push
   ```
2. Confirms:
   - `vector` extension
   - `segment_embeddings.start_seconds`
   - `search_segment_embeddings(query_embedding vector(1536), match_count, min_similarity, embedding_model)`

## Backfill commands

```bash
# Dry-run: show how many segments would be embedded
npm run embeddings:backfill -- --dry-run --limit 100

# Backfill first 500 segments
npm run embeddings:backfill -- --limit 500

# Backfill one video
npm run embeddings:backfill -- --videoId YOUR_VIDEO_ID
```

Backfill behavior:
- Reads `transcript_segments` from Supabase
- Skips rows whose `text_hash` already exists for the model
- Batches OpenAI calls (32 segments/batch)
- Upserts into `segment_embeddings` with vector + metadata

## Enable semantic search (staging)

```env
OPENAI_API_KEY=sk-...
SEMANTIC_SEARCH_ENABLED=true
EMBEDDING_MODEL=text-embedding-3-small
```

Restart app, then validate:

```bash
npm run search:validate-semantic
```

## API diagnostics

`GET /api/search-index?query=what+is+rag` returns:

```json
{
  "searchMode": "hybrid-keyword",
  "semanticEnabled": false,
  "semanticAvailable": false,
  "embeddingModel": "text-embedding-3-small",
  "fallbackReason": "semantic_disabled",
  "diagnostics": { "...": "..." }
}
```

When semantic is enabled and vectors exist, `searchMode` becomes `hybrid-keyword-semantic`.

## Validation queries

`npm run search:validate-semantic` compares keyword vs hybrid for:

- `what is rag`
- `how do transformers work`
- `what is backpropagation`
- `how to learn python`
- `what is kubernetes`

Without `OPENAI_API_KEY` or with `SEMANTIC_SEARCH_ENABLED=false`, the script completes in **safe fallback mode**.

## Rollback plan

1. Set `SEMANTIC_SEARCH_ENABLED=false` (immediate — keyword/hybrid-keyword only)
2. Leave `segment_embeddings` table in place (harmless when disabled)
3. To remove vectors: `truncate table segment_embeddings;` in Supabase SQL editor
4. Revert migration `007` only if necessary; keyword search does not depend on it

## Legal / ops notes

- Embeddings are generated from **transcript text only** (no video download)
- OpenAI API usage is billed per backfill/search query when enabled
- Rate-limit OpenAI by backfill `--limit` and keeping semantic off in production until corpus is embedded
