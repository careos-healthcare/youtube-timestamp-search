# Wave 1 — manual review pack

Generated: 2026-05-16T08:41:33.261Z

Governance checkpoint before the next controlled ingest batch. Judgment stays explicit; automation does not replace reviewer decisions.

## Outcome (update after review)

- **Ready for next ingest batch?** `false` — requires **1–5** rows with decision `approve_next_batch` and no conflicting rejects.
- **Recommended next action:** `manual_review_required`
- **Approved for next batch:** 0 / 14

## Review rubric

Score each dimension **1 (weak) – 5 (strong)** while watching or skimming the video and transcript sample. Use notes in `reviewerNotes` in `data/wave-1-human-review-decisions.json`.

| Criterion | What to look for |
|-----------|------------------|
| **Explanation density** | Clear definitions, step-by-step reasoning, not just headlines or hype. |
| **Citation potential** | Quotable claims, evidence, paper names, benchmarks — moments worth citing in research writing. |
| **Tutorial / practical value** | Actionable procedures, commands, configs — useful for practitioners, not only narrative. |
| **Source authority context** | Channel trust is a prior only; verify the *episode* adds expert depth vs shallow interview chatter. |
| **Transcript availability likelihood** | Captions quality, segment coherence, risk of poison/CTA segments breaking extraction. |
| **Topic coverage gain** | Fills gaps in `targetTopics` without duplicating near-identical corpus videos. |
| **Duplicate risk** | Same guest/topic/channel already represented in Wave 1 or indexed corpus. |
| **Conversational filler risk** | Long tangents, ads, multi-speaker chaos, listicle fluff lowering cite-worthy density. |
| **Expected research value per hour** | Expected cite-worthy + accepted moments per indexed transcript hour after materialization. |

## Decision values

| Value | Meaning |
|-------|---------|
| `approve_next_batch` | Include in the **next** controlled ingest batch (max 5 total). |
| `hold` | Defer; may revisit after more context or corpus changes. |
| `reject` | Do not ingest in Wave 1 expansion. |
| `needs_more_context` | Default — reviewer has not decided yet. |

## Summary

| Category | Count |
|----------|------:|
| uncertain | 10 |
| high-score-high-risk | 4 |
| low-score-high-potential | 0 |

| Decision | Count |
|----------|------:|
| `approve_next_batch` | 0 |
| `hold` | 0 |
| `reject` | 0 |
| `needs_more_context` | 14 |

## Candidates

### uncertain

#### Andrej Karpathy: Tesla AI, Self-Driving, Optimus, Aliens, and AGI | Lex Fridman Podcast #333

- **videoId:** `cdiD-9MMpb0`
- **channel:** Lex Fridman
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=cdiD-9MMpb0
- **profile:** tuned_v2 rank **36** / 36; top-5 profiles: none; priority pre/v1/v2 = 51/31/38; cite/h = —
- **target topics:** `how-llms-trained`, `machine-learning`, `state-of-ai-2026`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (Paper Explained)

- **videoId:** `TrdevFK_am4`
- **channel:** Yannic Kilcher
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=TrdevFK_am4
- **profile:** tuned_v2 rank **26** / 36; top-5 profiles: none; priority pre/v1/v2 = 57/38/44; cite/h = —
- **target topics:** `transformers`, `ml-paper-walkthroughs`, `machine-learning`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Gradients are Not All You Need (Machine Learning Research Paper Explained)

- **videoId:** `EeMhj0sPrhE`
- **channel:** Yannic Kilcher
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=EeMhj0sPrhE
- **profile:** tuned_v2 rank **32** / 36; top-5 profiles: none; priority pre/v1/v2 = 56/37/43; cite/h = —
- **target topics:** `machine-learning`, `ml-paper-walkthroughs`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### BYOL: Bootstrap Your Own Latent: A New Approach to Self-Supervised Learning (Paper Explained)

- **videoId:** `YPfUiOMYOEE`
- **channel:** Yannic Kilcher
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=YPfUiOMYOEE
- **profile:** tuned_v2 rank **33** / 36; top-5 profiles: none; priority pre/v1/v2 = 56/37/43; cite/h = —
- **target topics:** `machine-learning`, `ml-paper-walkthroughs`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Learning To Classify Images Without Labels (Paper Explained)

- **videoId:** `hQEnzdLkPj4`
- **channel:** Yannic Kilcher
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=hQEnzdLkPj4
- **profile:** tuned_v2 rank **27** / 36; top-5 profiles: none; priority pre/v1/v2 = 57/37/44; cite/h = —
- **target topics:** `machine-learning`, `ml-paper-walkthroughs`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Welcome to the Hugging Face course

- **videoId:** `00GKzGyWFEs`
- **channel:** Hugging Face
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=00GKzGyWFEs
- **profile:** tuned_v2 rank **28** / 36; top-5 profiles: none; priority pre/v1/v2 = 56/37/44; cite/h = —
- **target topics:** `hf-transformers-topic`, `transformers`, `llm-fine-tuning`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### The Transformer architecture

- **videoId:** `H39Z_720T5s`
- **channel:** Hugging Face
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=H39Z_720T5s
- **profile:** tuned_v2 rank **29** / 36; top-5 profiles: none; priority pre/v1/v2 = 57/38/44; cite/h = —
- **target topics:** `transformers`, `hf-transformers-topic`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Docker Containers and Kubernetes Fundamentals – Full Hands-On Course

- **videoId:** `kTp5xUtcalw`
- **channel:** freeCodeCamp.org
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=kTp5xUtcalw
- **profile:** tuned_v2 rank **6** / 36; top-5 profiles: none; priority pre/v1/v2 = 59/40/46; cite/h = —
- **target topics:** `docker-devops`, `kubernetes-beginners`, `devops-practice`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Docker and Kubernetes - Full Course for Beginners

- **videoId:** `Wf2eSG3owoA`
- **channel:** freeCodeCamp.org
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=Wf2eSG3owoA
- **profile:** tuned_v2 rank **7** / 36; top-5 profiles: none; priority pre/v1/v2 = 59/40/46; cite/h = —
- **target topics:** `docker-devops`, `kubernetes-beginners`, `kubernetes-comparison-depth`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Kubernetes Crash Course for Absolute Beginners [NEW]

- **videoId:** `s_o8dwzRlu4`
- **channel:** TechWorld with Nana
- **category:** uncertain
- **YouTube:** https://www.youtube.com/watch?v=s_o8dwzRlu4
- **profile:** tuned_v2 rank **8** / 36; top-5 profiles: none; priority pre/v1/v2 = 58/39/46; cite/h = —
- **target topics:** `kubernetes-beginners`, `kubernetes-comparison-depth`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; cite/h not measurable (no materialized moments); low cite/h despite high priority
- **why review:** Borderline governance signals; ranking unstable across profiles.
- **retrieval tier / overall:** D / 0.37
- **dims (0–1):** explanation=0.00 citation=0.00 tutorial=0.00 technical=0.00 clip=0.45 semantic=0.35
- **flags:** shallow_authority=true poison=none governance=Overall retrieval normalized score < 0.38; Low citation language and low technical density together
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

### high-score-high-risk

#### Docker Tutorial for Beginners - A Full DevOps Course on How to Run Applications in Containers

- **videoId:** `fqMOX6JJhGo`
- **channel:** freeCodeCamp.org
- **category:** high-score-high-risk
- **YouTube:** https://www.youtube.com/watch?v=fqMOX6JJhGo
- **profile:** tuned_v2 rank **1** / 36; top-5 profiles: pre, v1, v2; priority pre/v1/v2 = 71/62/74; cite/h = 1.84
- **target topics:** `docker-devops`, `devops-practice`
- **source quality:** 100 (A)
- **predicted strengths:** high cite/h in corpus; strong clip extraction dim; allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped
- **why review:** Scores high for ingest but research-density or poison flags disagree.
- **retrieval tier / overall:** B / 0.58
- **dims (0–1):** explanation=0.09 citation=0.03 tutorial=0.37 technical=1.00 clip=0.84 semantic=0.29
- **flags:** shallow_authority=true poison=none governance=none
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Yann Lecun: Meta AI, Open Source, Limits of LLMs, AGI & the Future of AI | Lex Fridman Podcast #416

- **videoId:** `5t1vTLU7s40`
- **channel:** Lex Fridman
- **category:** high-score-high-risk
- **YouTube:** https://www.youtube.com/watch?v=5t1vTLU7s40
- **profile:** tuned_v2 rank **2** / 36; top-5 profiles: pre, v1, v2; priority pre/v1/v2 = 61/45/62; cite/h = 0.36
- **target topics:** `how-llms-trained`, `transformers`, `llm-fine-tuning`
- **source quality:** 100 (A)
- **predicted strengths:** strong clip extraction dim; allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped; transcript poison heuristics (1)
- **why review:** Scores high for ingest but research-density or poison flags disagree.
- **retrieval tier / overall:** C / 0.46
- **dims (0–1):** explanation=0.20 citation=0.03 tutorial=0.10 technical=0.29 clip=1.00 semantic=0.56
- **flags:** shallow_authority=true poison=none governance=none
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### Machine Learning for Everybody – Full Course

- **videoId:** `i_LwzRVP7bg`
- **channel:** freeCodeCamp.org
- **category:** high-score-high-risk
- **YouTube:** https://www.youtube.com/watch?v=i_LwzRVP7bg
- **profile:** tuned_v2 rank **3** / 36; top-5 profiles: pre, v1, v2; priority pre/v1/v2 = 67/52/60; cite/h = 1.28
- **target topics:** `machine-learning`, `how-llms-trained`
- **source quality:** 100 (A)
- **predicted strengths:** high cite/h in corpus; strong clip extraction dim; allowlist A-tier source prior
- **predicted risks:** shallow authority / interview-shaped
- **why review:** Scores high for ingest but research-density or poison flags disagree.
- **retrieval tier / overall:** C / 0.47
- **dims (0–1):** explanation=0.26 citation=0.04 tutorial=0.07 technical=0.13 clip=0.67 semantic=0.32
- **flags:** shallow_authority=true poison=none governance=none
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

#### [Classic] Generative Adversarial Networks (Paper Explained)

- **videoId:** `eyxmSmjmNS0`
- **channel:** Yannic Kilcher
- **category:** high-score-high-risk
- **YouTube:** https://www.youtube.com/watch?v=eyxmSmjmNS0
- **profile:** tuned_v2 rank **4** / 36; top-5 profiles: pre, v1, v2; priority pre/v1/v2 = 75/66/58; cite/h = 0.00
- **target topics:** `machine-learning`, `ml-paper-walkthroughs`
- **source quality:** 100 (A)
- **predicted strengths:** allowlist A-tier source prior
- **predicted risks:** transcript poison heuristics (1); low cite/h despite high priority
- **why review:** Scores high for ingest but research-density or poison flags disagree.
- **retrieval tier / overall:** C / 0.46
- **dims (0–1):** explanation=0.22 citation=0.89 tutorial=0.13 technical=0.62 clip=0.16 semantic=0.00
- **flags:** shallow_authority=false poison=none governance=none
- **decision:** `needs_more_context`
- **reviewer notes:** _(empty)_

## Workflow

1. Edit decisions in `data/wave-1-human-review-decisions.json` (`decision`, `reviewerNotes`).
2. Run `npm run prepare:wave-1-review` to refresh this document.
3. Run `npm run validate:wave-1-review` before any ingest command.
