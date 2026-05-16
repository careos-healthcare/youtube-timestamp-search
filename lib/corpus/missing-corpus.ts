import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";

import type { TopicCoverageRow } from "./topic-coverage";
import { loadAllAllowlistEntries, normalizeChannelName } from "./source-allowlists";

export type SourceIndexRequestRecord = {
  requestedUrl: string;
  topic?: string;
  sourceType?: string;
  surface?: string;
  receivedAt?: string;
};

export type MissingCorpusFinding = {
  kind: "requested_url" | "recurring_topic" | "low_depth_topic" | "search_seed_gap";
  detail: string;
  weight: number;
};

function loadJsonRequests(path: string): SourceIndexRequestRecord[] {
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SourceIndexRequestRecord =>
        Boolean(r && typeof r === "object" && "requestedUrl" in r && typeof (r as SourceIndexRequestRecord).requestedUrl === "string")
    );
  } catch {
    return [];
  }
}

/**
 * Merge optional exported `source_index_request` payloads with heuristic gaps from coverage + allowlist seeds.
 * Pure function — no analytics side effects.
 */
export function buildMissingCorpusReport(input: {
  moments: PublicMomentRecord[];
  coverage: TopicCoverageRow[];
  /** Optional path to JSON array of request records (export from analytics). */
  requestsPath?: string;
}): { findings: MissingCorpusFinding[]; requests: SourceIndexRequestRecord[] } {
  const requestsPath = input.requestsPath ?? join(process.cwd(), "data", "analytics", "source-index-requests.json");
  const requests = loadJsonRequests(requestsPath);

  const findings: MissingCorpusFinding[] = [];

  for (const r of requests) {
    findings.push({
      kind: "requested_url",
      detail: `${r.requestedUrl}${r.topic ? ` (${r.topic})` : ""}`,
      weight: 3,
    });
  }

  for (const row of input.coverage) {
    if (row.weakComparisonDepth && row.numberOfMoments >= 5) {
      findings.push({
        kind: "low_depth_topic",
        detail: `Topic “${row.topic}” has ${row.numberOfVideos} videos / ${row.uniqueCreators} creators — weak comparison depth`,
        weight: 2,
      });
    }
    if (row.missingBeginner || row.missingCounterpoint) {
      findings.push({
        kind: "recurring_topic",
        detail: `Topic “${row.topic}” missing beginner (${row.missingBeginner}) or counterpoint (${row.missingCounterpoint}) coverage`,
        weight: 2,
      });
    }
  }

  const indexedCreators = new Set(
    input.moments.map((m) => normalizeChannelName(m.channelName ?? "")).filter((c) => c.length > 1)
  );

  const allow = loadAllAllowlistEntries();
  for (const a of allow) {
    if (a.ingestPriority < 88) continue;
    const key = normalizeChannelName(a.channelName);
    const hit = [...indexedCreators].some((c) => c === key || c.includes(key) || key.includes(c));
    if (!hit) {
      findings.push({
        kind: "search_seed_gap",
        detail: `High-priority allowlist channel “${a.channelName}” not detected in indexed moment channel names`,
        weight: 1,
      });
    }
  }

  findings.sort((a, b) => b.weight - a.weight);
  return { findings, requests };
}
