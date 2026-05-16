import test from "node:test";
import assert from "node:assert/strict";

import { estimateTranscriptHoursFromSegments } from "./retrieval-calibration";

test("estimateTranscriptHoursFromSegments uses last segment end", () => {
  const h = estimateTranscriptHoursFromSegments([
    { start: 0, duration: 10 },
    { start: 10, duration: 20 },
    { start: 30, duration: 5 },
  ]);
  assert.equal(h, 35 / 3600);
});

test("estimateTranscriptHoursFromSegments infers end when all cue durations are zero", () => {
  const h = estimateTranscriptHoursFromSegments([{ start: 100, duration: 0 }]);
  assert.ok(h != null);
  assert.ok(Math.abs(h! - 130 / 3600) < 1e-9);
});

test("estimateTranscriptHoursFromSegments returns null for empty", () => {
  assert.equal(estimateTranscriptHoursFromSegments([]), null);
});
