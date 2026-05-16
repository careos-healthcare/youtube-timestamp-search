import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildResearchSessionMetrics,
  calculateResearchDepthScore,
  classifyResearchWorkflowCohort,
  detectRepeatResearchBehavior,
} from "./research-session";

describe("research-session", () => {
  it("calculateResearchDepthScore caps at 100", () => {
    const score = calculateResearchDepthScore({
      queryChainLength: 10,
      topicChainLength: 10,
      compareActions: 5,
      citationExports: 5,
      saveActions: 5,
      revisitActions: 3,
      collectionVisits: 5,
      exportActions: 3,
      repeatedTopicInteractions: 3,
    });
    assert.equal(score, 100);
  });

  it("detectRepeatResearchBehavior on topic revisit", () => {
    assert.equal(
      detectRepeatResearchBehavior({
        queryChain: ["rag"],
        topicChain: ["kubernetes", "kubernetes"],
        repeatedTopicInteractions: 1,
        revisitActions: 0,
        saveActions: 0,
      }),
      true
    );
  });

  it("classify repeat_researcher cohort", () => {
    const depth = calculateResearchDepthScore({
      queryChainLength: 3,
      topicChainLength: 2,
      compareActions: 1,
      citationExports: 1,
      saveActions: 1,
      revisitActions: 1,
      collectionVisits: 1,
      exportActions: 0,
      repeatedTopicInteractions: 1,
    });
    const cohort = classifyResearchWorkflowCohort({
      sessionId: "t",
      firstQuery: "rag",
      queryChain: ["a", "b", "c"],
      topicChain: ["k8s", "rag"],
      compareActions: 1,
      citationExports: 1,
      saveActions: 1,
      revisitActions: 1,
      collectionVisits: 1,
      collectionRevisits: 0,
      exportActions: 0,
      topicDepth: 2,
      uniqueTopics: 2,
      repeatedTopicInteractions: 1,
      researchDepthScore: depth,
      repeatResearchBehavior: true,
      startedAt: "",
      endedAt: "",
      eventCount: 5,
    });
    assert.equal(cohort, "repeat_researcher");
  });

  it("buildResearchSessionMetrics from events", () => {
    const metrics = buildResearchSessionMetrics("sess-1", [
      {
        sessionId: "sess-1",
        eventName: "research_session_started",
        query: "docker kubernetes",
        videoId: null,
        payload: { researchSessionId: "sess-1" },
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        sessionId: "sess-1",
        eventName: "research_compare_used",
        query: "docker kubernetes",
        videoId: null,
        payload: {},
        createdAt: "2026-01-01T00:01:00.000Z",
      },
      {
        sessionId: "sess-1",
        eventName: "citation_workflow_completed",
        query: null,
        videoId: "abc",
        payload: { format: "markdown" },
        createdAt: "2026-01-01T00:02:00.000Z",
      },
    ]);
    assert.equal(metrics.firstQuery, "docker kubernetes");
    assert.equal(metrics.compareActions, 1);
    assert.equal(metrics.citationExports, 1);
    assert.ok(metrics.researchDepthScore > 0);
  });
});
