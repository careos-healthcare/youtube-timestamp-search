# Retrieval quality — calibration summary

Generated: 2026-05-16T16:14:53.509Z

## Strongest sources (current corpus)

- **Lex Fridman** (mean retrieval 0.627)
- **Corey Schafer** (mean retrieval 0.620)
- **freeCodeCamp** (mean retrieval 0.565)
- **Stanford Online** (mean retrieval 0.563)
- **Dwarkesh Patel** (mean retrieval 0.463)
- **Traversy Media** (mean retrieval 0.438)
- **DeepLearning.AI** (mean retrieval 0.424)
- **unknown_channel** (mean retrieval 0.415)

## Weakest sources (deprioritize for scale, not necessarily delete)

- **Stanford** (mean retrieval 0.292)
- **The Net Ninja** (mean retrieval 0.312)
- **Yannic Kilcher** (mean retrieval 0.323)
- **MIT OpenCourseWare** (mean retrieval 0.348)
- **Hugging Face** (mean retrieval 0.401)
- **unknown_channel** (mean retrieval 0.415)
- **DeepLearning.AI** (mean retrieval 0.424)
- **Traversy Media** (mean retrieval 0.438)

## Remaining Wave 1 batch

**Do not ingest all remaining 31 blindly.** Use `data/ingestion-wave-1-ranked.json` priority order, transcript gates, and per-video retrieval flags. Deprioritize rows with low `retrievalQuality.overallNormalized` or multiple matched reject heuristics until scoring improves.

## Recommended ingestion ordering (top 12)

- **w1-005** TrdevFK_am4 (Yannic Kilcher) — priority 72 retrieval 0.549 tier C
- **w1-007** EeMhj0sPrhE (Yannic Kilcher) — priority 64 retrieval 0.646 tier B
- **w1-016** s_o8dwzRlu4 (TechWorld with Nana) — priority 60 retrieval 0.461 tier C
- **w1-003** 5t1vTLU7s40 (Lex Fridman) — priority 59 retrieval 0.754 tier A
- **w1-017** S8eX0MxfnB4 (TechWorld with Nana) — priority 59 retrieval 0.461 tier C
- **w1-029** STKCRSUsyP0 (GOTO Conferences) — priority 59 retrieval 0.461 tier C
- **w1-004** cdiD-9MMpb0 (Lex Fridman) — priority 58 retrieval 0.688 tier B
- **w1-012** H39Z_720T5s (Hugging Face) — priority 58 retrieval 0.461 tier C
- **w1-015** fqMOX6JJhGo (freeCodeCamp.org) — priority 58 retrieval 0.652 tier B
- **w1-002** n1E9IZfvGMA (Dwarkesh Patel) — priority 56 retrieval 0.773 tier A
- **w1-011** 00GKzGyWFEs (Hugging Face) — priority 54 retrieval 0.401 tier C
- **w1-027** 6Z5hlKIDV44 (a16z) — priority 48 retrieval 0.461 tier C

## Scoring weaknesses / next improvements

- Join **product analytics** (saved clips, compare views, reformulated searches) to validate `researchValue` proxies.
- **Multi-speaker** detection is cue-length + line-pattern heuristics only — add diarization metadata when available.
- **Repeated phrase** uses bigram repetition; tune thresholds per genre (podcast vs lecture).
- **Clip / semantic dimensions** are neutral when transcripts are not yet materialized — re-run after ingest.

## Precision-over-scale rule

A smaller research-grade corpus beats a large mediocre one. If priority scores cluster low, pause expansion and fix sources or extraction before adding hours.
