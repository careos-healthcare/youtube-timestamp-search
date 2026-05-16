# Retrieval weight tuning — validation report

Generated: 2026-05-16T08:34:27.085Z

## North star

**Did retrieval trust improve?** — not “did the corpus grow?”

## Which dimensions predict cite-worthy output?

| Dimension | r (citations/h) | r (accepted/h) | mean norm |
|-----------|----------------:|---------------:|----------:|
| Semantic extraction yield | 0.714 | -0.025 | 0.181 |
| Clip extraction quality (materialized moments) | 0.636 | 0.031 | 0.521 |
| Average accepted moment score (quality model) | 0.631 | -0.031 | 0.535 |
| Multi-speaker / panel chaos (inverted) | 0.252 | 0.088 | 0.974 |
| Filler disfluency (inverted) | 0.143 | -0.031 | 0.831 |
| Citation / evidence language | 0.106 | -0.098 | 0.089 |
| Actionable / procedural language | 0.101 | 0.249 | 0.143 |
| Explanation density | 0.079 | -0.285 | 0.197 |
| Segment length coherence | 0.073 | 0.081 | 0.785 |
| Repeated phrase / loopiness (inverted) | 0.021 | -0.393 | 0.733 |
| Question–answer rhythm | 0.014 | -0.222 | 0.177 |
| Speculation / opinion (inverted) | -0.012 | -0.145 | 0.771 |
| Technical terminology density | -0.049 | -0.089 | 0.298 |
| Concrete example framing | -0.074 | -0.222 | 0.152 |

## Conversational drift heuristic (tutorial false positives)

- Matched videos: 1
- Would spare tutorial-shaped (action density ≥ 0.45): 0
- Sample channels: Lex Fridman

## High research density, low corpus footprint (not popularity)

- **Stanford Online** — cite/h 1.15, retrieval 0.445, footprint 5
- **Traversy Media** — cite/h 0.88, retrieval 0.417, footprint 19
- **Corey Schafer** — cite/h 0.59, retrieval 0.443, footprint 17

## Large footprint, weak retrieval value

- **freeCodeCamp** — moments 127, retrieval 0.453, cite/h 0.57
- **Dwarkesh Patel** — moments 35, retrieval 0.402, cite/h 0.63
- **unknown_channel** — moments 0, retrieval 0.367, cite/h —
- **Lex Fridman** — moments 17, retrieval 0.414, cite/h 0.55
- **Traversy Media** — moments 13, retrieval 0.417, cite/h 0.88
- **Corey Schafer** — moments 13, retrieval 0.443, cite/h 0.59
- **Yannic Kilcher** — moments 5, retrieval 0.400, cite/h 0.00

## Small expert channels vs large conversational sources

| Archetype | Mean cite/h | Mean research density | Channels (sample) |
|-----------|------------:|----------------------:|-------------------|
| Expert / technical (low footprint) | 0.874 | 0.677 | Stanford Online, Traversy Media, Corey Schafer |
| Large conversational / podcast-shaped | 0.586 | 0.513 | freeCodeCamp, Dwarkesh Patel, Lex Fridman |

Research-value ranking should follow **density per transcript hour**, not audience size or moment count alone.

## Wave 1 capped simulation (top-5, no ingest)

| Profile | Expected cite/h | Expected accepted/h | Trust improved vs pre? |
|---------|----------------:|--------------------:|------------------------|
| Pre-calibration | 0.871 | 1.755 | baseline |
| Tuned v1 | 0.697 | 1.404 | **no** |
| Tuned v2 (semantic + clip emphasis) | 0.697 | 1.404 | **no** |

| Δ cite/h v1 vs pre | -0.174 |
| Δ cite/h v2 vs pre | -0.174 |
| Δ cite/h v2 vs v1 | 0.000 |

**Ready for controlled ingest?** **No** — weight tuning has not reliably improved cite-worthy output per hour yet.

### v2 batch video ids (simulation only)

fqMOX6JJhGo, 5t1vTLU7s40, i_LwzRVP7bg, eyxmSmjmNS0, qTogNUV3CAI

## Tuned ingestion priority profile (summary)

```json
{
  "sourceQuality": 0.06,
  "retrievalOverall": 0.11,
  "topicCoverageGain": 0.08,
  "semanticYieldEstimate": 0.14,
  "citationPotential": 0.05,
  "corpusDiversityBonus": 0.1,
  "creatorDuplicationPenalty": 0.08,
  "transcriptLengthBand": 0.04,
  "explanationDensityBoost": 0.08,
  "technicalDensityBoost": 0.11,
  "clipExtractionBoost": 0.16,
  "semanticMomentYieldBoost": 0.14,
  "researchWorkflowBoost": 0.08,
  "shallowAuthorityPenalty": 5,
  "perRejectHeuristicPenalty": 2,
  "maxRejectPenalty": 10
}
```
