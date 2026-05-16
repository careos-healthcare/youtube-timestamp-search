# Enterprise research tooling rubric

Readiness levels for cross-source spoken knowledge infrastructure. **No enterprise features are built until the corpus and graph justify the level.**

Use with `research-graph.json` → `enterpriseReadinessScore` (placeholder heuristic). Human review overrides scores for go-to-market decisions.

---

## L0 — Public search prototype

**What it is:** Index-backed search and moment pages; trust labels experimental.

| Dimension | Requirement |
|-----------|-------------|
| Product | Search, moment page, basic citation copy |
| Corpus | Any indexed videos; no topic governance |
| Trust | Ad hoc quality scoring |
| Analytics | Page events only |
| Security | Public read-only |
| Monetization | None |

**Exit criteria to L1:** Research session instrumentation live; ≥1 strong flagship topic; graph snapshot v1.

---

## L1 — Research workflow

**What it is:** Repeatable query → topic → compare → cite → return loops measurable.

| Dimension | Requirement |
|-----------|-------------|
| Product | Compare explanations, topic hubs, continue exploring, saved library (local) |
| Corpus | High-signal topic registry seeded; flagship report green for promoted paths |
| Trust | Source authority + citation-rich flags on moments |
| Analytics | `research_session_*` events, depth score, cohorts |
| Security | Public; no PII storage |
| Monetization | Not ready |

**Exit criteria to L2:** Citation workflow completion rate meaningful; ≥3 topics at research-grade **strong**; orphan moment rate &lt;20% in graph.

---

## L2 — Trusted research library

**What it is:** Durable personal corpus of saved research with exports trusted for writing.

| Dimension | Requirement |
|-----------|-------------|
| Product | Saved library export (markdown/links); moment citations stable URLs |
| Corpus | Elite topics at min citation density 40%+; compare depth ≥2 per elite topic |
| Trust | Manual review gate for Wave ingest; retrieval governance signed off |
| Analytics | Save→return rate tracked |
| Security | Optional account for library sync (future); still no teams |
| Monetization | **Ready for Pro** — export + library sync wedge |

**Exit criteria to L3:** Multi-user demand validated; graph `Collection` + `ResearchSession` nodes populated from backend.

---

## L3 — Team knowledge workspace

**What it is:** Shared collections, compare sets, and session visibility inside a team.

| Dimension | Requirement |
|-----------|-------------|
| Product | Shared collections, team compare boards, comment on moments (future) |
| Corpus | Topic tiers contracted per team; private upload lane optional |
| Trust | Audit trail on graph edits; reviewer role on ingest |
| Analytics | Team-level research depth dashboards (internal only) |
| Security | SSO, workspace RBAC, data residency statement |
| Monetization | **Ready for team per-seat** |

**Exit criteria to L4:** Enterprise pilots ask for API + compliance packet; ≥10 elite topics with L4 corpus metrics.

---

## L4 — Enterprise research infrastructure

**What it is:** Private corpus, API access, compliance, SLAs — graph as system of record.

| Dimension | Requirement |
|-----------|-------------|
| Product | Admin API, bulk export, topic provisioning, ingest tickets |
| Corpus | Customer-specific subgraphs; cross-source (YouTube + podcast minimum) |
| Trust | Signed governance reports per topic; legal review on citation templates |
| Analytics | SLA metrics, ingest freshness, trust drift alerts |
| Security | SOC2 path, DPA, encryption at rest, access logs |
| Monetization | **Ready for enterprise contracts** |

**Exit criteria to L5:** Multimodal sources materially increase cite density; cross-source graph queries &lt;2s p95.

---

## L5 — Multimodal / cross-source intelligence layer

**What it is:** Unified graph across spoken + visual + documents; research intelligence without chat-first UX.

| Dimension | Requirement |
|-----------|-------------|
| Product | Cross-source compare, timeline-aligned evidence boards |
| Corpus | Multimodal ingestion governed per source type |
| Trust | Per-modality trust model fused into `source_context` edges |
| Analytics | Cross-source session outcomes |
| Security | Enterprise L4 + media isolation |
| Monetization | Platform + usage-based API |

---

## Scoring placeholder (graph report)

`enterpriseReadinessScore` (0–100) in `RESEARCH_GRAPH_REPORT.md` is a **structural** heuristic:

- Topic coverage depth, creator diversity, citation density, compare-readiness  
- Penalties: weak-context share, orphan moments  

It does **not** replace this rubric for product or compliance decisions.

---

## Current posture (fill from latest report)

Run `npm run report:research-graph` and map score roughly:

| Score | Indicative level |
|------:|------------------|
| 0–29 | L0 |
| 30–44 | L1 partial |
| 45–59 | L2 partial |
| 60–74 | L3 partial |
| 75+ | L4 graph-ready (features still not built) |

**Do not claim L4 in marketing until L4 rows in this doc are true in production.**
