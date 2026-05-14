import { buildAnswerDominance } from "@/lib/search/answer-dominance";
import { rankAnswerQuality } from "@/lib/search/answer-quality-ranking";
import { getSearchLandingData } from "@/lib/search-landing-engine";
import { synthesizeMultiVideoAnswer } from "@/lib/search/multi-video-synthesis";
import { PRIORITY_SEARCH_QUERIES } from "@/lib/search-query-seeds";

const SAMPLE_QUERIES = PRIORITY_SEARCH_QUERIES.slice(0, 10).map((seed) => seed.phrase);

export async function buildAnswerQualityReport() {
  const evaluations = [];

  for (const query of SAMPLE_QUERIES) {
    const landing = await getSearchLandingData(query, 24);
    const dominance = buildAnswerDominance({
      query,
      moments: landing.moments,
      relatedPhrases: landing.relatedPhrases,
      peopleAlsoSearched: landing.peopleAlsoSearched,
    });
    const synthesis = synthesizeMultiVideoAnswer(query, landing.moments);
    const ranked = rankAnswerQuality({ answer: dominance });

    evaluations.push({
      query,
      mode: dominance.mode,
      confidence: dominance.confidence,
      qualityScore: ranked.qualityScore,
      hasDirectAnswer: Boolean(dominance.directAnswer),
      hasBeginner: Boolean(dominance.bestBeginnerExplanation),
      hasTechnical: Boolean(dominance.bestTechnicalExplanation),
      hasPractical: Boolean(dominance.bestPracticalExample),
      consensus: Boolean(synthesis.consensusExplanation),
      videoCount: synthesis.videoProfiles.length,
      themeCount: synthesis.recurringThemes.length,
    });
  }

  const answered = evaluations.filter((item) => item.mode === "answer").length;
  const withConsensus = evaluations.filter((item) => item.consensus).length;

  return {
    generatedAt: new Date().toISOString(),
    evaluations,
    answerCoveragePercent: Number(((answered / evaluations.length) * 100).toFixed(1)),
    consensusCoveragePercent: Number(((withConsensus / evaluations.length) * 100).toFixed(1)),
    averageQualityScore: Number(
      (evaluations.reduce((sum, item) => sum + item.qualityScore, 0) / evaluations.length).toFixed(2)
    ),
  };
}

export function formatAnswerQualityMarkdown(report: Awaited<ReturnType<typeof buildAnswerQualityReport>>) {
  const rows = report.evaluations
    .map(
      (item, index) =>
        `| ${index + 1} | ${item.query.replace(/\|/g, "\\|")} | ${item.mode} | ${item.confidence.toFixed(2)} | ${item.qualityScore.toFixed(1)} | ${item.hasDirectAnswer ? "yes" : "no"} | ${item.consensus ? "yes" : "no"} | ${item.videoCount} |`
    )
    .join("\n");

  return `# Answer Quality Report

Generated: ${report.generatedAt}
Sample queries: ${report.evaluations.length}
Answer coverage: ${report.answerCoveragePercent}%
Consensus coverage: ${report.consensusCoveragePercent}%
Average quality score: ${report.averageQualityScore}

## Evidence-backed answer evaluation

| Rank | Query | Mode | Confidence | Quality | Direct | Consensus | Videos |
|------|-------|------|----------:|--------:|:------:|:---------:|-------:|
${rows}

## Ranking signals

Answers are ranked by transcript extraction confidence, clickthrough, dwell, successful exits, and penalized for reformulation and bounce-back behavior.

## Regenerate

\`\`\`bash
npm run search:validate-answers
\`\`\`
`;
}
