/**
 * Prints tracked canonical moment URLs for manual distribution (X, Reddit, HN, etc.).
 * Uses the same UTM builder as in-app share surfaces (`buildTrackedPublicMomentPageUrl`).
 *
 * Usage:
 *   npm run distribution:export-links
 *   npm run distribution:export-links -- --count=5
 */

import { loadPublicMoments } from "@/lib/moments/load-public-moments";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { buildTrackedPublicMomentPageUrl } from "@/lib/og-urls";
import { buildPublicMomentUrl, buildTopicPath, getSiteUrl } from "@/lib/seo";

const FOCUS: { re: RegExp; weight: number; label: string }[] = [
  { re: /\bkubernetes\b/i, weight: 14, label: "kubernetes" },
  { re: /\banthropic\b/i, weight: 14, label: "anthropic" },
  { re: /\binference\b/i, weight: 12, label: "inference" },
  { re: /\b(llm|large language)\b/i, weight: 10, label: "llm" },
  { re: /\b(docker|container orchestration)\b/i, weight: 9, label: "docker" },
  { re: /\b(cluster|gpu|compute|training)\b/i, weight: 7, label: "infra" },
  { re: /\b(transformer|pytorch|tensorflow|pytorch)\b/i, weight: 8, label: "ml_stack" },
  { re: /\b(agent|agents|rag|retrieval)\b/i, weight: 8, label: "agents_rag" },
  { re: /\b(code|coding|developer|workflow|debug)\b/i, weight: 5, label: "dev_workflow" },
];

function parseCount(): number {
  const raw = process.argv.find((a) => a.startsWith("--count="));
  if (!raw) return 5;
  const n = Number.parseInt(raw.slice("--count=".length), 10);
  return Number.isFinite(n) && n > 0 && n <= 25 ? n : 5;
}

function focusScore(row: PublicMomentRecord): { score: number; tags: string[] } {
  const hay = `${row.topic ?? ""} ${row.phrase} ${row.snippet} ${row.videoTitle ?? ""} ${row.category ?? ""}`;
  const tags: string[] = [];
  let bonus = 0;
  for (const f of FOCUS) {
    if (f.re.test(hay)) {
      bonus += f.weight;
      tags.push(f.label);
    }
  }
  return { score: (row.qualityScore ?? 0) + bonus, tags: [...new Set(tags)] };
}

function pickMoments(rows: PublicMomentRecord[], count: number): PublicMomentRecord[] {
  const scored = rows
    .map((row) => ({ row, ...focusScore(row) }))
    .filter((x) => x.tags.length > 0)
    .sort((a, b) => b.score - a.score || b.row.phrase.length - a.row.phrase.length);

  const out: PublicMomentRecord[] = [];
  const seenVideo = new Set<string>();
  for (const { row } of scored) {
    if (seenVideo.has(row.videoId)) continue;
    seenVideo.add(row.videoId);
    out.push(row);
    if (out.length >= count) break;
  }

  /** Guarantee a few named intents for this distribution phase (replace lowest-ranked tail). */
  const guarantees: { label: string; test: (r: PublicMomentRecord) => boolean }[] = [
    { label: "anthropic", test: (r) => /\banthropic\b/i.test(`${r.phrase} ${r.snippet} ${r.videoTitle ?? ""}`) },
    { label: "kubernetes", test: (r) => /\bkubernetes\b/i.test(`${r.phrase} ${r.snippet}`) },
  ];

  for (const g of guarantees) {
    if (out.some(g.test)) continue;
    const add = scored.map((x) => x.row).find((row) => g.test(row) && !seenVideo.has(row.videoId));
    if (!add) continue;
    if (out.length >= count) {
      const dropIdx = out.reduce(
        (worst, cur, i, arr) => (focusScore(cur).score < focusScore(arr[worst]).score ? i : worst),
        0
      );
      seenVideo.delete(out[dropIdx]!.videoId);
      out.splice(dropIdx, 1);
    }
    seenVideo.add(add.videoId);
    out.unshift(add);
    if (out.length > count) out.length = count;
  }

  return out.slice(0, count);
}

function main() {
  const site = getSiteUrl().replace(/\/$/, "");
  const count = parseCount();
  const rows = loadPublicMoments();
  const picked = pickMoments(rows, count);

  console.log(`# Distribution export — canonical moments (tracked)\n`);
  console.log(`Site: ${site}`);
  console.log(`Rows in index: ${rows.length} | Exporting: ${picked.length} (unique videoId, focus-weighted)\n`);
  console.log(`Use **only** the tracked URLs below in posts so UTMs match analytics.\n`);

  for (const row of picked) {
    const { score, tags } = focusScore(row);
    const canonical = buildPublicMomentUrl(row.id, row.canonicalSlug);
    const topicUrl = row.topic ? `${site}${buildTopicPath(row.topic)}` : "";

    console.log(`---`);
    console.log(`**${row.phrase}** — ${row.videoTitle ?? row.videoId}`);
    console.log(`Channel: ${row.channelName ?? "—"} | Topic: ${row.topic ?? "—"} | quality ${row.qualityScore ?? "—"} + focus → **${score}** (${tags.join(", ")})`);
    console.log(`Timestamp: ${row.timestamp}`);
    console.log(`Canonical (no UTM): ${canonical}`);
    if (topicUrl) console.log(`Topic hub: ${topicUrl}`);
    console.log(``);
    console.log(`Tracked — X/Twitter:`);
    console.log(buildTrackedPublicMomentPageUrl(row.id, row.canonicalSlug, "twitter", "social"));
    console.log(`Tracked — Reddit:`);
    console.log(buildTrackedPublicMomentPageUrl(row.id, row.canonicalSlug, "reddit", "social"));
    console.log(`Tracked — Hacker News:`);
    console.log(buildTrackedPublicMomentPageUrl(row.id, row.canonicalSlug, "hackernews", "social"));
    console.log(``);
  }

  if (picked.length === 0) {
    console.error("No moments matched focus heuristics. Loosen FOCUS in scripts/distribution-export-links.ts.");
    process.exitCode = 1;
  }
}

main();
