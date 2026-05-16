import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import type { AllowlistSourceEntry, SourceAllowlistCategory, SourceAllowlistFile } from "./source-types";

const ALLOWLIST_FILES: { category: SourceAllowlistCategory; file: string }[] = [
  { category: "ai_research", file: "ai-research.json" },
  { category: "ml_engineering", file: "ml-engineering.json" },
  { category: "backend_devops", file: "backend-devops.json" },
  { category: "programming_tutorials", file: "programming-tutorials.json" },
  { category: "startup_founder", file: "startup-founder.json" },
  { category: "university_lectures", file: "university-lectures.json" },
  { category: "conference_talks", file: "conference-talks.json" },
];

export function normalizeChannelName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\.(org|com)$/i, "");
}

function loadFile(root: string, file: string): SourceAllowlistFile | null {
  const p = join(root, file);
  if (!existsSync(p)) return null;
  try {
    const raw = readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as SourceAllowlistFile;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sources)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Load all curated allowlists from `data/source-allowlists/`. */
export function loadAllAllowlistEntries(rootDir = join(process.cwd(), "data", "source-allowlists")): AllowlistSourceEntry[] {
  const out: AllowlistSourceEntry[] = [];
  for (const { file } of ALLOWLIST_FILES) {
    const doc = loadFile(rootDir, file);
    if (!doc) continue;
    for (const s of doc.sources) {
      if (s.enabled) out.push(s);
    }
  }
  return out;
}

/** Find allowlist row by channel id (exact) or normalized channel name (fuzzy contains / equality). */
export function findAllowlistMatch(input: {
  channelName?: string;
  channelId?: string | null;
  rootDir?: string;
}): AllowlistSourceEntry | null {
  const entries = loadAllAllowlistEntries(input.rootDir);
  const id = input.channelId?.trim();
  if (id) {
    const byId = entries.find((e) => e.channelId && e.channelId === id);
    if (byId) return byId;
  }
  const name = normalizeChannelName(input.channelName ?? "");
  if (!name) return null;
  let best: AllowlistSourceEntry | null = null;
  let bestScore = 0;
  for (const e of entries) {
    const en = normalizeChannelName(e.channelName);
    if (name === en) return e;
    if (name.includes(en) || en.includes(name)) {
      const score = Math.min(name.length, en.length) / Math.max(name.length, en.length);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
  }
  return bestScore >= 0.55 ? best : null;
}

export function listAllowlistFilesMeta() {
  return ALLOWLIST_FILES;
}
