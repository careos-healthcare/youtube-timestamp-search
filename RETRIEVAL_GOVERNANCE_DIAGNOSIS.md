# Retrieval governance — diagnostic report

Generated: 2026-05-16T08:34:27.555Z

## Executive summary

**Recommendation: `manual_review_required`**

- Top-5 overlap is very high (5/5 shared across all profiles; Jaccard pre↔v2=1.00). Weight changes mostly reorder marginally, not rebuild the batch.
- With fair comparison (null cite/h as 0), pre and v2 top-5 cite/h means are nearly identical (0.697 vs 0.697). Tuning failed because the batch barely changed.
- Pre-calibration priority is ~42% driven by source_quality factor; allowlist scores cluster at 100, overpowering retrieval signals.
- 32 under-ranked high-potential and 0 over-ranked weak candidates — human judgment needed before trusting automation.
- Tutorial/action density correlates positively with cite/h (r≈0.73) — cite/h alone is not penalizing tutorials; null/zero cite/h on non-materialized videos is the larger distortion.
- ready_for_controlled_ingest is NOT supported: tuned profiles do not reliably beat pre-calibration on fair cite/h and multi-objective top-5 metrics.

## Diagnostic questions

### Are Wave 1 candidates too similar?

Wave 1 has 36 candidates across 14 channels; 5/5 top-5 slots are identical across pre/v1/v2. Tuning reorders scores but rarely changes the research-value frontier.

### Same videos in all top-5 profiles?

Shared: eyxmSmjmNS0, fqMOX6JJhGo, i_LwzRVP7bg, 5t1vTLU7s40, qTogNUV3CAI. Jaccard pre↔v1=1.00, pre↔v2=1.00, v1↔v2=1.00. Swaps: pre-only —; v2-only —.

### Does cite/h penalize tutorials?

Tutorial/action dim vs cite/h correlation r=0.733 — tutorials are not systematically punished by cite/h; missing materialized moments (null cite/h) distort batch comparisons.

### Do source priors overpower retrieval quality?

Pre-calibration positive priority mass is ~42% from source_quality (many A-tier=100 scores). Tuned v2 reduces this to ~15% but overlap keeps batch cite/h flat.

### Do penalties suppress good technical content?

Governance penalties target poison/CTA heuristics; tutorial-dense rows with high action dim generally retain priority via technical/tutorial boosts and drift heuristic sparing (action≥0.45).

### Batch metric methodology

Pre top-5 cite/h mean excluding null = 0.697; tuned v2 with null=0 = 0.697. Fair comparison (both null=0): pre 0.697 vs v2 0.697.

## Top-5 overlap matrix

| Set | Count | IDs |
|-----|------:|-----|
| Shared all three | 5 | eyxmSmjmNS0, fqMOX6JJhGo, i_LwzRVP7bg, 5t1vTLU7s40, qTogNUV3CAI |
| Unique pre | 0 | — |
| Unique v1 | 0 | — |
| Unique v2 | 0 | — |

## Top-5 multi-objective comparison (fair cite/h = null as 0)

| Profile | cite/h (excl null) | cite/h (null=0) | accepted/h | semantic yield dim | clip dim | creators | topics |
|---------|-------------------:|----------------:|-----------:|-------------------:|---------:|---------:|-------:|
| pre_calibration | 0.697 | 0.697 | 1.404 | 0.305 | 0.626 | 4 | 9 |
| tuned_v1 | 0.697 | 0.697 | 1.404 | 0.305 | 0.626 | 4 | 9 |
| tuned_v2 | 0.697 | 0.697 | 1.404 | 0.305 | 0.626 | 4 | 9 |

## Candidate swaps (top-5 membership)

| Video | Pre | V1 | V2 | cite/h | swap note |
|-------|:---:|:--:|:--:|-------:|----------|
| eyxmSmjmNS0 | ✓ | ✓ | ✓ | 0.00 | retained in pre and v2 top-5 |
| qTogNUV3CAI | ✓ | ✓ | ✓ | 0.00 | retained in pre and v2 top-5 |
| i_LwzRVP7bg | ✓ | ✓ | ✓ | 1.28 | retained in pre and v2 top-5 |
| fqMOX6JJhGo | ✓ | ✓ | ✓ | 1.84 | retained in pre and v2 top-5 |
| 5t1vTLU7s40 | ✓ | ✓ | ✓ | 0.36 | retained in pre and v2 top-5 |

## Misrankings

- **obviously_good_ranks_low** `qTogNUV3CAI` (Dwarkesh Patel): Strong cite/h (0.00) or semantic/clip dims but priority ≤48 (v2=46).
- **obviously_good_ranks_low** `n1E9IZfvGMA` (Dwarkesh Patel): Strong cite/h (0.00) or semantic/clip dims but priority ≤48 (v2=44).
- **obviously_good_ranks_low** `cdiD-9MMpb0` (Lex Fridman): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=28).
- **obviously_good_ranks_low** `TrdevFK_am4` (Yannic Kilcher): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=34).
- **obviously_good_ranks_low** `EeMhj0sPrhE` (Yannic Kilcher): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=33).
- **obviously_good_ranks_low** `YPfUiOMYOEE` (Yannic Kilcher): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=33).
- **obviously_good_ranks_low** `hQEnzdLkPj4` (Yannic Kilcher): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=34).
- **obviously_good_ranks_low** `00GKzGyWFEs` (Hugging Face): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=34).
- **obviously_good_ranks_low** `H39Z_720T5s` (Hugging Face): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=35).
- **obviously_good_ranks_low** `kTp5xUtcalw` (freeCodeCamp.org): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=36).
- **obviously_good_ranks_low** `Wf2eSG3owoA` (freeCodeCamp.org): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=36).
- **obviously_good_ranks_low** `s_o8dwzRlu4` (TechWorld with Nana): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=35).
- **obviously_good_ranks_low** `S8eX0MxfnB4` (TechWorld with Nana): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=35).
- **obviously_good_ranks_low** `jGwO_UgTS7I` (Stanford Online): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=35).
- **obviously_good_ranks_low** `TjZBTDzGeGg` (MIT OpenCourseWare): Strong cite/h (—) or semantic/clip dims but priority ≤48 (v2=34).
