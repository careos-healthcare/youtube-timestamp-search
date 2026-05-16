import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { trackServerEvent, type AnalyticsEventName } from "@/lib/analytics";

type CorpusPayload = Record<string, string | number | boolean | null | undefined>;

/** Append-only local pipeline log + dev server hook (no dashboards). */
export function recordCorpusPipelineEvent(name: AnalyticsEventName, payload: CorpusPayload = {}) {
  trackServerEvent(name, payload);

  try {
    const dir = join(process.cwd(), "data", "analytics");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify({ ts: new Date().toISOString(), name, payload }) + "\n";
    appendFileSync(join(dir, "corpus-pipeline-events.jsonl"), line, "utf8");
  } catch {
    // non-fatal
  }
}
