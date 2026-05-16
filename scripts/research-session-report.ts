#!/usr/bin/env tsx
/**
 * Research workflow session report from Supabase analytics (when configured).
 *
 *   npm run report:research-sessions
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadLocalEnv } from "@/lib/ingestion-script-env";
import {
  buildResearchSessionReport,
  formatResearchSessionReportMarkdown,
} from "@/lib/research/research-session-aggregation";

function main() {
  loadLocalEnv();

  void buildResearchSessionReport()
    .then((report) => {
      const jsonPath = join(process.cwd(), "data", "research-session-report.json");
      const mdPath = join(process.cwd(), "RESEARCH_SESSION_REPORT.md");

      const { sessions, ...summary } = report;
      writeFileSync(
        jsonPath,
        JSON.stringify(
          {
            ...summary,
            topSessionsByDepth: [...sessions]
              .sort((a, b) => b.researchDepthScore - a.researchDepthScore)
              .slice(0, 25)
              .map((s) => ({
                sessionId: s.sessionId,
                cohort: s.cohort,
                researchDepthScore: s.researchDepthScore,
                firstQuery: s.firstQuery,
                queryChainLength: s.queryChain.length,
                topicChainLength: s.topicChain.length,
                compareActions: s.compareActions,
                citationExports: s.citationExports,
                saveActions: s.saveActions,
                revisitActions: s.revisitActions,
                repeatResearchBehavior: s.repeatResearchBehavior,
              })),
          },
          null,
          2
        ),
        "utf-8"
      );
      writeFileSync(mdPath, formatResearchSessionReportMarkdown(report), "utf-8");

      console.log(`Wrote ${jsonPath}`);
      console.log(`Wrote ${mdPath}`);
      console.log(`Sessions: ${report.sessionsAnalyzed}; events: ${report.eventsAnalyzed}`);
      if (report.sessionsAnalyzed === 0) {
        console.log(
          "Note: zero sessions — configure Supabase admin client and accumulate persistent analytics events."
        );
      }
    })
    .catch((e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    });
}

main();
