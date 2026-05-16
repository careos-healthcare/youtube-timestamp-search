# Retrieval-quality calibration report

Generated: 2026-05-16T16:14:51.746Z

## Framing

This report **does not** optimize ingest throughput. It measures **research yield density**: accepted and citation-worthy moments normalized by **indexed transcript hours** where duration could be resolved from the transcript cache.

**North star:** would a serious user return to research this topic again — not whether we can surface another clip.

## Global density (moments tied to known transcript hours)

| Metric | Value |
|--------|------:|
| Total moments | 280 |
| Unique videos | 58 |
| Videos with resolved transcript duration | 58 |
| Sum of known transcript hours (videos counted once each) | 186.980 |
| Accepted moments / transcript hour (global) | 1.40 |
| Citation-worthy moments / transcript hour (global) | 0.86 |
| Moments / transcript hour (known-hours slice) | 1.50 |

## Repeat research behavior

Repeat saves, compare flows, and reformulated searches require server-side analytics aggregates (e.g. saved_clip, compare_explanation_*, research_*). This report uses corpus-local heuristics only until those are joined in a later pipeline step.

**Heuristic proxy in tables:** `research_workflow_share` = share of moments with technical / counterpoint / primary-source phrasing (see `classifyExplanationFromText`). It is not a substitute for product analytics.

## By channel (source)

Sorted by **citation-worthy / transcript hour** (desc). Channels with no resolved transcript hours show **—** for hour-normalized columns; raw counts still indicate clutter vs. cite density.

| Channel | Videos | Moments | Known h | accepted/h | cite-worthy/h | moments/h | low-tier % | shallow auth % | research workflow % | poison-pattern % |
|---------|-------:|--------:|--------:|-----------:|---------------:|------------:|-----------:|-----------------:|----------------------:|------------------:|
| Yannic Kilcher | 7 | 25 | 4.795 | 3.55 | 4.17 | 5.21 | 32.0% | 8.0% | 100.0% | 0.0% |
| Lex Fridman | 6 | 33 | 19.131 | 1.72 | 1.46 | 1.72 | 0.0% | 90.9% | 39.4% | 0.0% |
| unknown_channel | 1 | 2 | 1.741 | 1.15 | 1.15 | 1.15 | 0.0% | 100.0% | 100.0% | 0.0% |
| Dwarkesh Patel | 12 | 41 | 21.367 | 1.59 | 0.89 | 1.92 | 17.1% | 87.8% | 41.5% | 0.0% |
| freeCodeCamp.org | 20 | 88 | 117.992 | 0.75 | 0.75 | 0.75 | 0.0% | 0.0% | 50.0% | 0.0% |
| Andrej Karpathy | 1 | 2 | 3.523 | 0.57 | 0.57 | 0.57 | 0.0% | 0.0% | 100.0% | 0.0% |
| TechWorld with Nana | 1 | 1 | 2.771 | 0.36 | 0.36 | 0.36 | 0.0% | 0.0% | 0.0% | 0.0% |
| freeCodeCamp | 22 | 71 | 120.453 | 0.57 | 0.00 | 0.59 | 2.8% | 0.0% | 45.1% | 2.8% |
| Corey Schafer | 2 | 6 | 6.712 | 0.89 | 0.00 | 0.89 | 0.0% | 0.0% | 16.7% | 0.0% |
| Traversy Media | 3 | 5 | 5.671 | 0.88 | 0.00 | 0.88 | 0.0% | 0.0% | 40.0% | 0.0% |
| DeepLearning.AI | 2 | 2 | 4.827 | 0.00 | 0.00 | 0.41 | 100.0% | 100.0% | 100.0% | 0.0% |
| Stanford Online | 1 | 1 | 1.741 | 0.57 | 0.00 | 0.57 | 0.0% | 0.0% | 100.0% | 0.0% |
| The Net Ninja | 1 | 1 | 0.208 | 4.82 | 0.00 | 4.82 | 0.0% | 0.0% | 0.0% | 0.0% |
| Stanford | 1 | 1 | 0.647 | 1.55 | 0.00 | 1.55 | 0.0% | 0.0% | 0.0% | 0.0% |
| MIT OpenCourseWare | 1 | 1 | 1.428 | 0.70 | 0.00 | 0.70 | 0.0% | 0.0% | 100.0% | 0.0% |

## By topic (top 40 by moment count)

| Topic | Videos | Moments | Known h | accepted/h | cite-worthy/h | low-tier % | research workflow % |
|-------|-------:|--------:|--------:|-----------:|---------------:|-----------:|----------------------:|
| uncategorized | 33 | 127 | 151.543 | 0.84 | 0.84 | 0.0% | 51.2% |
| statistics-for-ml, statistics-for-ml | 2 | 20 | 4.286 | 4.67 | 4.67 | 0.0% | 50.0% |
| rag, rag, transformers, vector-database | 1 | 10 | 0.499 | 14.02 | 20.03 | 30.0% | 100.0% |
| kubernetes-beginners | 1 | 9 | 2.967 | 3.03 | 0.00 | 0.0% | 33.3% |
| perl-programming | 1 | 8 | 1.783 | 4.49 | 0.00 | 0.0% | 100.0% |
| backend-python | 1 | 7 | 5.905 | 1.19 | 0.00 | 0.0% | 28.6% |
| docker-devops | 1 | 6 | 2.170 | 2.76 | 0.00 | 0.0% | 83.3% |
| adam-marblestone | 1 | 5 | 1.825 | 2.19 | 0.00 | 20.0% | 20.0% |
| bootstrap | 1 | 5 | 3.897 | 0.77 | 0.00 | 40.0% | 60.0% |
| react-native | 1 | 5 | 6.744 | 0.74 | 0.00 | 0.0% | 60.0% |
| c-programming | 1 | 4 | 3.770 | 1.06 | 0.00 | 0.0% | 0.0% |
| flask-tutorial | 1 | 3 | 0.783 | 3.83 | 0.00 | 0.0% | 33.3% |
| transformers | 1 | 3 | 6.869 | 0.44 | 0.00 | 0.0% | 33.3% |
| mark-zuckerberg-llama | 1 | 3 | 1.301 | 0.00 | 0.00 | 100.0% | 33.3% |
| git-github | 1 | 3 | 1.141 | 2.63 | 0.00 | 0.0% | 33.3% |
| backend-development | 1 | 3 | 10.131 | 0.30 | 0.00 | 0.0% | 100.0% |
| angular-full-course | 1 | 3 | 5.562 | 0.54 | 0.00 | 0.0% | 0.0% |
| dylan-patel-compute | 1 | 3 | 2.512 | 1.19 | 0.00 | 0.0% | 33.3% |
| terence-tao | 1 | 3 | 1.395 | 2.15 | 0.00 | 0.0% | 0.0% |
| terminal | 1 | 3 | 5.929 | 0.51 | 0.00 | 0.0% | 0.0% |
| golang | 1 | 3 | 3.008 | 1.00 | 0.00 | 0.0% | 0.0% |
| state-of-ai-2026 | 1 | 2 | 4.418 | 0.45 | 0.00 | 0.0% | 100.0% |
| sergey-levine | 1 | 2 | 1.466 | 1.36 | 0.00 | 0.0% | 50.0% |
| typescript-course | 1 | 2 | 3.278 | 0.61 | 0.00 | 0.0% | 0.0% |
| react-context | 1 | 2 | 0.175 | 11.40 | 0.00 | 0.0% | 0.0% |
| nextjs-14 | 1 | 2 | 3.016 | 0.66 | 0.00 | 0.0% | 100.0% |
| css | 1 | 2 | 7.016 | 0.29 | 0.00 | 0.0% | 0.0% |
| how-llms-trained, transformers, llm-fine-tuning | 1 | 2 | 2.788 | 0.72 | 0.72 | 0.0% | 0.0% |
| how-llms-trained | 1 | 1 | 2.228 | 0.45 | 0.00 | 0.0% | 100.0% |
| ilya-sutskever | 1 | 1 | 1.600 | 0.00 | 0.00 | 100.0% | 0.0% |
| michael-levin | 1 | 1 | 3.300 | 0.30 | 0.00 | 0.0% | 0.0% |
| sql-fundamentals | 1 | 1 | 4.344 | 0.23 | 0.00 | 0.0% | 0.0% |
| machine-learning | 1 | 1 | 1.304 | 0.00 | 0.00 | 100.0% | 100.0% |
| claude-code | 1 | 1 | 4.463 | 0.22 | 0.00 | 0.0% | 100.0% |
| llm-fine-tuning | 1 | 1 | 11.941 | 0.08 | 0.00 | 0.0% | 100.0% |
| free-transformer-vae | 1 | 1 | 0.670 | 0.00 | 0.00 | 100.0% | 100.0% |
| html5-css3 | 1 | 1 | 0.372 | 2.69 | 0.00 | 0.0% | 100.0% |
| sam-altman-programming | 1 | 1 | 0.044 | 22.67 | 0.00 | 0.0% | 100.0% |
| deepseek-openai-nvidia | 1 | 1 | 5.104 | 0.20 | 0.00 | 0.0% | 100.0% |
| michael-nielsen | 1 | 1 | 2.051 | 0.49 | 0.00 | 0.0% | 100.0% |

## How to read “noise” vs “reusable knowledge”

- **Reusable knowledge:** higher **cite-worthy/h** and **accepted/h** with lower **low-tier %**.
- **Semantic clutter:** high **moments/h** with low **cite-worthy/h**, or high **shallow auth %** + high **low-tier %**.
- **Transcript poison:** marketing / CTA phrases in the moment text (`poison-pattern %`) — often harmless in isolation but noisy at scale.

**Hard rule (calibration):** if a source grows moment count faster than it grows citation-worthy and accepted density per transcript hour, treat it as a **net negative** for retrieval until rescored or deprioritized.
