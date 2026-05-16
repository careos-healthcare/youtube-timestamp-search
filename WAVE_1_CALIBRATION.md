# Wave 1 — retrieval-quality calibration

**Scope:** This document is **standalone**. It does not replace or subsume `CORPUS_INGESTION_WAVE_1_PLAN.md`. Ingestion planning describes *what we may index and when*; calibration describes *how we judge whether indexed material improves research-grade retrieval*.

---

## Framing

We are **no longer optimizing ingestion throughput**. Throughput is a lever, not the objective.

We are optimizing **research-grade signal density**: moments and passages that support comparison, verification, and follow-up reading—not bulk hours in the index.

Calibration is therefore a **retrieval-quality** concern: scoring, gates, and prioritization must align with how people actually *use* the corpus (search, save, compare, cite), not with how large the corpus grows.

---

## Questions this work must answer

Calibration analysis and experiments should produce evidence on:

1. **Which sources consistently produce cite-worthy moments?**  
   Channels and allowlist rows whose accepted segments skew toward citation-rich, definition-stable, and quotable explanations—not generic hype or recap.

2. **Which sources create shallow semantic clutter?**  
   High segment count with low distinctiveness, weak anchors, or repetitive phrasing that bloats retrieval without improving answers.

3. **Which transcript patterns poison retrieval quality?**  
   e.g. heavy ads, cross-talk, “like and subscribe” padding, listicle filler, non-technical tangents, or ASR errors that dominate embeddings and snippets.

4. **Which channels create repeat saves, searches, and comparisons?**  
   Product signals (where available) that indicate *workflow* use, not one-off clicks: saved moments, return queries, compare flows—not raw view counts.

5. **Which topics generate genuine research workflows?**  
   Topic clusters where users chain multiple moments, refine queries, or land on practitioner/academic labels—vs. one-hit entertainment exits.

---

## First-class metrics

Treat the following as **primary** success measures for this phase (not secondary to volume):

| Metric | Intent |
|--------|--------|
| **Accepted moments per transcript hour** | Density of material that passes quality gates and indexing rules, normalized by source length—rewards concise signal, penalizes noise-per-hour. |
| **Citation-worthy moments per transcript hour** | Stricter slice: moments that meet cite-rich / authority / snippet stability criteria—**the** density metric for “research value per hour indexed.” |

All other corpus growth metrics (raw moments, raw hours, video count) are **supporting** or diagnostic only. If they rise without these two rising, treat that as a regression signal, not a win.

---

## What not to use as a proxy

**Do not trust source popularity** (subscriber count, viral views, brand fame) as a proxy for research value.

Some **smaller technical channels** may deliver **more citation-worthy moments per hour** than large general-audience podcasts. Calibration should surface that empirically and let prioritization follow the metrics above, not audience size.

---

## Priority order (next phase)

1. **Retrieval-quality calibration** — Measure and tune how accepted and citation-worthy density behave by source, topic, and transcript pattern; align scoring and gates with those outcomes.  
2. **Ingestion prioritization refinement** — Order and cap work using signal-density metrics and gates, not queue length or “clear the backlog.”  
3. **Allowlist weighting** — Adjust relative weight and tier behavior **after** calibration evidence exists; avoid reshuffling the allowlist ahead of measured clutter vs. cite-worth signals.  
4. **Only then** — **Selective expansion** of remaining Wave 1 candidates (and similar batches), still under explicit limits and transcript gates.

---

## Hard rule

**If a source increases corpus size faster than it increases research value, it is a net negative.**

“Research value” here means movement in **accepted moments per transcript hour** and **citation-worthy moments per transcript hour** (and corroborating retrieval/product signals where available)—not popularity or raw ingest count.

Sources that fail this rule should be deprioritized, gated more strictly, or removed from the allowlist until calibration says otherwise.

---

## North star (user intent)

Optimize for: **Would a serious user come back to research this topic again?**

Do **not** optimize for: **Can we surface another clip?**

The calibration layer and reports below exist to make that intent measurable.

---

## Operational layer (implemented)

| Piece | Purpose |
|-------|---------|
| `lib/corpus/retrieval-calibration.ts` | Computes per-channel and per-topic **accepted/citation-worthy density per indexed transcript hour**, plus heuristics for shallow authority, transcript “poison” patterns, and research-workflow phrasing (technical / counterpoint / primary-source cues). |
| `lib/moments/public-moment-citation-rich.ts` | Single definition of **citation-worthy** (semantic markdown/academic citation hooks) reused by corpus reports and calibration. |
| `scripts/retrieval-calibration-report.ts` | Loads public moments, resolves transcript end-time from the transcript cache (Supabase and/or local file cache), writes **`data/retrieval-calibration.json`** and **`RETRIEVAL_CALIBRATION_REPORT.md`**. |
| `npm run report:retrieval-calibration` | Regenerate calibration artifacts (no UI). |
| `lib/corpus/retrieval-quality.ts` | **Retrieval-quality** transcript + moment dimensions (0–1 each), tiers, explainable breakdown, reject heuristics (score-only; no deletes). |
| `lib/corpus/ingestion-priority.ts` | **`buildIngestionPriorityScore`** — combines source quality, retrieval quality, topic gain, diversity, duplication, transcript length band. |
| `lib/corpus/research-value-metrics.ts` | **Research-value** proxies per video: citations/accepted/semantic per hour, compare-pair and topic-link opportunity counts. |
| `scripts/retrieval-quality-report.ts` | Writes **`RETRIEVAL_QUALITY_REPORT.md`**, **`RETRIEVAL_QUALITY_CALIBRATION_REPORT.md`**, **`data/retrieval-quality-evaluation.json`**, **`data/ingestion-wave-1-ranked.json`**. |
| `npm run report:retrieval-quality` | Regenerate retrieval-quality evaluation + Wave 1 priority rank (no UI). |
| `npm run test:retrieval-calibration` | Unit tests for transcript-hour estimation. |

**Repeat research behavior** (saves, compare, reformulated searches) is **not** inferred from static JSON alone; the report documents that gap and points to joining server-side analytics (e.g. `saved_clip`, `compare_explanation_*`, `research_*`) in a follow-up pipeline step.

---

## Relationship to other artifacts

| Artifact | Role |
|----------|------|
| `data/retrieval-calibration.json`, `RETRIEVAL_CALIBRATION_REPORT.md` | **Machine + human-readable calibration output** — which sources and topics score well on density vs. clutter (regenerate after meaningful corpus changes). |
| `data/retrieval-quality-evaluation.json`, `RETRIEVAL_QUALITY_REPORT.md`, `RETRIEVAL_QUALITY_CALIBRATION_REPORT.md`, `data/ingestion-wave-1-ranked.json` | **Retrieval-quality scoring + ingestion priority** — explainable dimensions, reject-pattern counts, and ranked Wave 1 queue order. |
| `data/wave-1-ingestion-results.json` | Post-run machine-readable summary (gates, rows, corpus snapshots)—inputs for **before/after** calibration slices. |
| `CORPUS_HEALTH_REPORT.md`, `PUBLIC_MOMENT_QUALITY_REPORT.md` | Corpus-wide health and moment-quality views—aggregate checks after calibration changes. |
| `CORPUS_INGESTION_WAVE_1_PLAN.md` | **Ingestion** batch intent and candidate policy—**not** the home for retrieval-density strategy. |

This file is the canonical place for **retrieval-quality calibration** strategy and metric definitions until superseded by a later versioned doc.
