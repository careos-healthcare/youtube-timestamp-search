import assert from "node:assert/strict";

import {
  getContinueExploringPhrases,
  getRecoveryQueryAttempts,
  getSynonymExpansions,
  normalizeForSearch,
} from "../lib/search/query-expansion";

assert.equal(normalizeForSearch("ai-agents"), "ai agents");
assert.ok(getSynonymExpansions("ai agents").includes("agentic ai"));
assert.ok(getSynonymExpansions("rag").includes("semantic search"));

const attempts = getRecoveryQueryAttempts("ai-agents");
assert.ok(attempts.length >= 3);
assert.equal(attempts[0].path, "exact");
assert.ok(attempts.some((a) => a.path === "normalized"));

const explore = getContinueExploringPhrases("rag", 20);
assert.ok(explore.length > 0);

console.log("query-expansion validation ok");
