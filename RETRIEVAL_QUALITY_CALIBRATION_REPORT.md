# Retrieval quality — calibration summary

Generated: 2026-05-16T04:44:23.193Z

## Strongest sources (current corpus)

- **freeCodeCamp** (mean retrieval 0.453)
- **Stanford Online** (mean retrieval 0.445)
- **Corey Schafer** (mean retrieval 0.443)
- **MIT OpenCourseWare** (mean retrieval 0.431)
- **Stanford** (mean retrieval 0.420)
- **Traversy Media** (mean retrieval 0.417)
- **Lex Fridman** (mean retrieval 0.414)
- **Dwarkesh Patel** (mean retrieval 0.402)

## Weakest sources (deprioritize for scale, not necessarily delete)

- **unknown_channel** (mean retrieval 0.367)
- **The Net Ninja** (mean retrieval 0.379)
- **DeepLearning.AI** (mean retrieval 0.386)
- **Yannic Kilcher** (mean retrieval 0.400)
- **Dwarkesh Patel** (mean retrieval 0.402)
- **Lex Fridman** (mean retrieval 0.414)
- **Traversy Media** (mean retrieval 0.417)
- **Stanford** (mean retrieval 0.420)

## Remaining Wave 1 batch

**Do not ingest all remaining 31 blindly.** Use `data/ingestion-wave-1-ranked.json` priority order, transcript gates, and per-video retrieval flags. Deprioritize rows with low `retrievalQuality.overallNormalized` or multiple matched reject heuristics until scoring improves.

## Recommended ingestion ordering (top 12)

- **w1-006** eyxmSmjmNS0 (Yannic Kilcher) — priority 75 retrieval 0.459 tier C
- **w1-005** TrdevFK_am4 (Yannic Kilcher) — priority 71 retrieval 0.491 tier C
- **w1-007** EeMhj0sPrhE (Yannic Kilcher) — priority 70 retrieval 0.491 tier C
- **w1-008** YPfUiOMYOEE (Yannic Kilcher) — priority 70 retrieval 0.491 tier C
- **w1-009** hQEnzdLkPj4 (Yannic Kilcher) — priority 70 retrieval 0.491 tier C
- **w1-003** 5t1vTLU7s40 (Lex Fridman) — priority 61 retrieval 0.464 tier C
- **w1-016** s_o8dwzRlu4 (TechWorld with Nana) — priority 61 retrieval 0.491 tier C
- **w1-017** S8eX0MxfnB4 (TechWorld with Nana) — priority 61 retrieval 0.491 tier C
- **w1-024** CBYhVcO4WgI (Y Combinator) — priority 61 retrieval 0.463 tier C
- **w1-012** H39Z_720T5s (Hugging Face) — priority 60 retrieval 0.491 tier C
- **w1-018** jGwO_UgTS7I (Stanford Online) — priority 60 retrieval 0.398 tier C
- **w1-027** 6Z5hlKIDV44 (a16z) — priority 60 retrieval 0.454 tier C

## Scoring weaknesses / next improvements

- Join **product analytics** (saved clips, compare views, reformulated searches) to validate `researchValue` proxies.
- **Multi-speaker** detection is cue-length + line-pattern heuristics only — add diarization metadata when available.
- **Repeated phrase** uses bigram repetition; tune thresholds per genre (podcast vs lecture).
- **Clip / semantic dimensions** are neutral when transcripts are not yet materialized — re-run after ingest.

## Precision-over-scale rule

A smaller research-grade corpus beats a large mediocre one. If priority scores cluster low, pause expansion and fix sources or extraction before adding hours.
