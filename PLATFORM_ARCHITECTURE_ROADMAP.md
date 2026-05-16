# Platform architecture roadmap

Strategic direction (fixed): build toward **multimodal knowledge infrastructure**, a **cross-source research graph**, and **enterprise research tooling** — without premature billing, auth, teams UI, embeddings, chat, or broad crawling.

## Product vision

Turn spoken knowledge (video/podcast transcripts today; slides and calls tomorrow) into a **durable research graph**: cite-worthy moments as nodes, not orphan SEO pages. Researchers should move from search → compare → cite → return, with explicit trust and governance at every hop.

North star metric: **research-grade trust density per indexed hour**, not pageviews or raw corpus size.

## Target users

| Segment | Job to be done |
|---------|----------------|
| Individual researcher | Find timestamped evidence, compare framings, export citations |
| Technical learner | Depth on a topic with beginner + technical paths |
| Content / research ops | Curate high-signal topic corpora with governance reports |
| Future: team lead | Shared research library with audit trail |
| Future: enterprise | Cross-source research workspace with compliance |

## Data model direction

Layers (bottom → top):

1. **Sources** — YouTube today; podcast RSS, webinars, uploads later  
2. **Media** — `Video`, future `AudioEpisode`  
3. **Transcript** — `TranscriptSegment` anchored in time  
4. **Knowledge** — `PublicMoment`, `Explanation`, `ClaimLikeStatement`, `Citation`  
5. **Organization** — `Topic`, `Creator`, `Collection`  
6. **Behavior** — `ResearchSession` (workflow, not pageview)

All entities are graph-addressable (`lib/graph/research-graph-types.ts`). Pages are projections of subgraphs.

## Source types

| Type | Status |
|------|--------|
| `youtube` | Active (indexed transcripts) |
| `podcast_rss` | Planned |
| `webinar` | Planned |
| `internal_upload` | Enterprise later |
| `unknown` | Fallback |

## Graph entities (v1)

Nodes: `Source`, `Video`, `TranscriptSegment`, `PublicMoment`, `Topic`, `Creator`, `ClaimLikeStatement`, `Explanation`, `Citation`, `Collection`, `ResearchSession`.

Edges: `explains`, `cites`, `contradicts_or_caveats`, `supports`, `same_topic_as`, `created_by`, `clipped_from`, `saved_in`, `searched_in_session`, `compared_with`, `source_context`.

Build pipeline: `lib/graph/build-research-graph.ts` → `data/research-graph.json`.

## Corpus governance

- **High-signal topic registry** (`lib/corpus/high-signal-topics.ts`) — 50–100 excellent topics, not SEO sprawl  
- **Research-grade scoring** (`lib/corpus/topic-research-grade.ts`) — elite / strong / weak / broken  
- **Flagship coverage** (`lib/corpus/flagship-topics.ts`) — homepage trust minimums  
- **Retrieval governance** — weight tuning, manual review gate, Wave 1 controlled ingest  
- **Ingestion** — allowlist-first, wave-based; no broad crawl

## Retrieval governance

- Hybrid keyword + optional semantic retrieval (semantic not required for graph v1)  
- Research session instrumentation for workflow depth  
- Compare-explanations and citation workflows as first-class signals  
- Reports must pass before homepage promotion or ingest expansion

## Trust model

Heuristic, explainable layers (not “verified truth”):

- **Source authority context** — primary, practitioner, tutorial, opinion-heavy, etc.  
- **Quality tier** — materialized moment score  
- **Citation-rich** — exportable markdown/academic strings  
- **Governance flags** — shallow authority, poison heuristics, weak educational density  

Trust is a **property on nodes and edges**, surfaced in UI copy as context labels.

## Future multimodal inputs

| Modality | Graph impact |
|----------|----------------|
| Slides / decks | New `Source` + `VisualSegment` nodes; `supports` edges to spoken claims |
| Screen recording | Time-aligned `TranscriptSegment` + UI event metadata |
| PDF / paper | `Citation` targets external `Document` nodes |
| Live meeting | `ResearchSession` + speaker diarization → `Creator` edges |

No multimodal work until spoken corpus trust density is proven on 50–100 elite topics.

## Future enterprise layer

See `ENTERPRISE_RESEARCH_TOOLING_RUBRIC.md` (L0–L5). Capabilities before UI:

- Team libraries with ACL on `Collection` and `ResearchSession`  
- Audit log on graph mutations  
- SSO / SCIM (not built)  
- Export APIs for citation graphs  
- SLA on ingest freshness per topic tier  

## Monetization path (no implementation yet)

| Phase | Wedge |
|-------|--------|
| Now | Free public research search + citation export (trust building) |
| L2+ | Pro: saved research library sync, advanced compare, bulk export |
| L3+ | Team workspace per-seat |
| L4+ | Enterprise: private corpus, compliance, API, dedicated topic tiers |

Do not implement billing until L2 product surface is validated by session analytics.

## What NOT to build yet

- Auth, teams, roles, dashboards  
- Billing / Stripe  
- Embeddings-at-scale / vector DB as primary retrieval  
- Chat / AI summaries over corpus  
- Broad YouTube crawling  
- Fake enterprise admin UI  
- Database migrations for graph (types + JSON snapshot first)  

## Near-term engineering sequence

1. **Research Graph v1** (this phase) — types, snapshot, metrics, reports  
2. Deepen elite topics only (Wave 1 + research-grade priorities)  
3. Persist graph snapshots over time (trust drift)  
4. Session ↔ graph linking (`searched_in_session` edges from analytics)  
5. Second source type pilot (podcast) as new `Source` nodes  
6. Enterprise L2 library (still minimal UI)  

## Reports

| Command | Output |
|---------|--------|
| `npm run report:research-graph` | `RESEARCH_GRAPH_REPORT.md`, `data/research-graph.json` |
| `npm run report:research-grade-topics` | Research-grade topic tiers |
| `npm run report:flagship-topics` | Homepage trust coverage |
| `npm run retrieval-governance-diagnosis` | Tuning failure analysis |

The product wins when moments are **nodes in a research graph**, not rows in a sitemap.
