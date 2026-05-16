import type { IngestionRecommendation, IngestionSourceTier } from "./source-types";

export function explainIngestionTier(tier: IngestionSourceTier): string {
  switch (tier) {
    case "A":
      return "Tier A — allowlisted or very strong structural signals; prefer high-priority queue.";
    case "B":
      return "Tier B — acceptable candidate; verify transcript density before wide promotion.";
    case "C":
      return "Tier C — marginal; keep in candidate queue with tight caps.";
    case "D":
      return "Tier D — likely low signal or penalty-heavy; reject or human-review only.";
    default:
      return "Unknown tier.";
  }
}

export function explainIngestionRecommendation(rec: IngestionRecommendation): string {
  switch (rec) {
    case "promote":
      return "Recommend promotion to high-priority ingestion (subject to dedupe and rate limits).";
    case "candidate":
      return "Keep as candidate — useful but not default-bulk without extra checks.";
    case "reject":
      return "Reject for automated bulk paths; manual exception only.";
    default:
      return "";
  }
}

export function formatScoreReasons(reasons: string[], penalties: string[]): string {
  const r = reasons.length ? `Boosts: ${reasons.join("; ")}` : "Boosts: (none)";
  const p = penalties.length ? `Penalties: ${penalties.join("; ")}` : "Penalties: (none)";
  return `${r}\n${p}`;
}
