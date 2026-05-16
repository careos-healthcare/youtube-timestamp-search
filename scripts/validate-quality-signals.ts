/**
 * Validates heuristic quality signal outputs (no network).
 *
 *   npm run validate:quality-signals
 */

import { strict as assert } from "node:assert";

import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import { evaluateMomentQualitySignals, evaluatePublicMoment } from "@/lib/quality";

function main() {
  const moments = loadPublicMoments();
  assert.ok(moments.length > 0, "public moments list empty");

  for (const m of moments) {
    const ev = evaluatePublicMoment(m);
    assert.ok(ev.signals.length > 0, `signals empty for moment ${m.id}`);
    assert.ok(ev.whyThisRanks.length >= 3, `whyThisRanks thin for ${m.id}`);
    assert.ok(["high", "medium", "low"].includes(ev.qualityTier), `bad tier ${m.id}`);
  }

  const high = moments.reduce((b, m) => ((m.qualityScore ?? 0) > (b.qualityScore ?? 0) ? m : b), moments[0]!);
  const highEv = evaluatePublicMoment(high);
  assert.ok(highEv.qualityScore >= 15, "expected top stored-score moment to map to non-trivial composite");

  const opinionSnippet =
    "I think this is probably the hardest part of the system because maybe we are wrong about the assumptions.";
  const opinionEv = evaluateMomentQualitySignals({
    phrase: "system design",
    snippet: opinionSnippet.repeat(3),
    videoTitle: "Podcast",
    channelName: "Unknown Host",
  });
  assert.ok(
    opinionEv.signals.some((s) => s.includes("Opinion")) || opinionEv.warnings.length > 0,
    "opinion-heavy snippet should surface opinion or warnings"
  );

  const fillerEv = evaluateMomentQualitySignals({
    phrase: "um",
    snippet: "um uh um uh like you know um",
    videoTitle: "x",
  });
  assert.ok(fillerEv.qualityTier === "low" || fillerEv.warnings.length > 0, "filler snippet should be low tier or warned");

  const missingMeta = evaluateMomentQualitySignals({
    phrase: "kubernetes networking",
    snippet:
      "Because pods communicate through services, kubernetes routes traffic using kube-proxy and iptables rules. For example, a ClusterIP service maps virtual IPs to endpoints.",
    videoTitle: "Kubernetes networking deep dive",
  });
  assert.ok(missingMeta.signals.length > 0, "technical explanation should still emit signals without channel");

  console.log(`[validate:quality-signals] OK — checked ${moments.length} public moments + synthetic cases.`);
}

main();
