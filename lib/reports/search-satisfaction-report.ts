import {
  buildSessionIntelligenceSignals,
  computeSearchSatisfactionScore,
  groupEventsIntoSessions,
  loadSessionAnalyticsEvents,
} from "@/lib/search-session";

export async function buildSearchSatisfactionReport() {
  const events = await loadSessionAnalyticsEvents();
  const sessions = groupEventsIntoSessions(events);
  const signals = buildSessionIntelligenceSignals(sessions);
  const satisfaction = computeSearchSatisfactionScore(signals);

  return {
    generatedAt: new Date().toISOString(),
    eventsAnalyzed: events.length,
    sessions,
    signals,
    satisfaction,
  };
}

export function formatSearchSatisfactionMarkdown(
  report: Awaited<ReturnType<typeof buildSearchSatisfactionReport>>
) {
  return `# Search Satisfaction Report

Generated: ${report.generatedAt}
Events analyzed: ${report.eventsAnalyzed}
Sessions analyzed: ${report.signals.totalSessions}

## Search satisfaction score

| Metric | Value |
|--------|------:|
| Score | ${report.satisfaction.score} |
| Label | ${report.satisfaction.label} |
| Answer success rate | ${report.satisfaction.breakdown.answerSuccessRate} |

## Session intelligence

| Signal | Count |
|--------|------:|
| Reformulations | ${report.signals.reformulationCount} |
| Pogo-sticking | ${report.signals.pogoStickCount} |
| Abandonment | ${report.signals.abandonmentCount} |
| Successful answer sessions | ${report.signals.successfulAnswerSessions} |
| Avg queries / session | ${report.signals.avgQueriesPerSession} |

## Score breakdown

| Component | Value |
|-----------|------:|
| Click success | ${report.satisfaction.breakdown.clickSuccess.toFixed(1)} |
| Low reformulation | ${report.satisfaction.breakdown.lowReformulation.toFixed(1)} |
| Low pogo-stick | ${report.satisfaction.breakdown.lowPogoStick.toFixed(1)} |
| Low abandonment | ${report.satisfaction.breakdown.lowAbandonment.toFixed(1)} |
| Reformulation penalty | ${report.satisfaction.breakdown.penalties.reformulationPenalty.toFixed(1)} |
| Pogo penalty | ${report.satisfaction.breakdown.penalties.pogoPenalty.toFixed(1)} |
| Abandonment penalty | ${report.satisfaction.breakdown.penalties.abandonmentPenalty.toFixed(1)} |

## Principle

This product is a **knowledge retrieval engine grounded in timestamped evidence** — not a chat wrapper.

## Regenerate

\`\`\`bash
npm run search:validate-answers
\`\`\`
`;
}
