#!/usr/bin/env tsx
/**
 * SEO health audit for crawlable public pages.
 *
 * Usage:
 *   npm run audit:seo              # full crawl + index quality report
 *   npm run audit:seo:quick        # homepage, transcripts, key searches, trending, saved, 2 priority videos
 *   AUDIT_BASE_URL=http://localhost:3000 npm run audit:seo
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { listCachedTranscripts } from "../lib/transcript-cache";
import { NOT_INDEXED_EMPTY_STATE } from "../lib/empty-state-copy";
import {
  SEARCH_QUERY_SLUGS,
  STATIC_BUILD_SEARCH_SLUGS,
  phraseFromSearchSlug,
} from "../lib/search-query-seeds";
import { getSearchLandingData } from "../lib/search-landing-engine";
import { buildMomentSitemapEntries } from "../lib/moment-sitemap";
import { SITEMAP_INCLUDE_MOMENTS } from "../lib/sitemap-config";
import { listAllIndexedVideoIds } from "../lib/indexed-videos";
import { loadPublicMoments } from "../lib/moments/load-public-moments";
import { buildPublicMomentPath, buildVideoPath, getSiteUrl } from "../lib/seo";

const MIN_VISIBLE_TEXT = 200;
const VIDEO_SAMPLE_SIZE = 20;

/** Client deadline for non-video HTML fetches (search, home, etc.). */
const FETCH_TIMEOUT_NORMAL_MS = 30_000;

/** Client deadline per attempt for `/video/*` (heavy SSR). */
const FETCH_TIMEOUT_VIDEO_MS = 75_000;

/**
 * Video routes: retry the whole fetch (including HTTP retry loop) up to 2 times after a timeout
 * (3 attempts total) before recording TIMEOUT.
 */
const VIDEO_FETCH_MAX_ATTEMPTS = 3;

/** Retries within one attempt after true 502/503/504/429. */
const HTTP_ERROR_RETRY_ATTEMPTS = 2;

const HTTP_RETRY_DELAY_MS = 1200;
const VIDEO_TIMEOUT_RETRY_DELAY_MS = 1200;

/** Always audit these video pages (heavy / regression targets). */
const SEO_PRIORITY_VIDEO_IDS = ["7CqJlxBYj-M", "gh2_PhgZGsM"];

type PageOutcome = "pass" | "failed_http" | "failed_html" | "timed_out";

type AuditCheck = {
  name: string;
  pass: boolean;
  detail?: string;
};

type PageAuditResult = {
  url: string;
  status: number;
  checks: AuditCheck[];
  pass: boolean;
  outcome: PageOutcome;
};

function isQuickMode() {
  return process.argv.includes("--quick") || process.env.AUDIT_QUICK === "1";
}

function isVideoPath(path: string) {
  return path.startsWith("/video/") || path.startsWith("/moment/");
}

function isPngBody(buffer: ArrayBuffer) {
  if (buffer.byteLength < 8) return false;
  const u8 = new Uint8Array(buffer.slice(0, 8));
  return u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
}

type OgPngAudit = { url: string; pass: boolean; status: number; contentType: string; detail?: string };

async function auditMomentOgPng(baseUrl: string, pathAndQuery: string): Promise<OgPngAudit> {
  const url = `${baseUrl.replace(/\/$/, "")}${pathAndQuery}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "youtube-timestamp-search-seo-audit/1.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_NORMAL_MS),
    });
    const buf = await res.arrayBuffer();
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const pngHeader = ct.includes("image/png");
    const pngMagic = isPngBody(buf);
    const pass = res.status === 200 && (pngHeader || pngMagic);
    return {
      url,
      pass,
      status: res.status,
      contentType: res.headers.get("content-type") ?? (pngMagic ? "image/png (magic)" : ""),
      detail: pass ? undefined : pngMagic ? undefined : `body_bytes=${buf.byteLength}`,
    };
  } catch (error) {
    return {
      url,
      pass: false,
      status: 0,
      contentType: "",
      detail: error instanceof Error ? error.message : "fetch_failed",
    };
  }
}

async function auditMomentOgRoutes(baseUrl: string): Promise<OgPngAudit[]> {
  const moments = loadPublicMoments().slice(0, 2);
  const out: OgPngAudit[] = [];
  for (const m of moments) {
    out.push(await auditMomentOgPng(baseUrl, `/api/og/moment-public/${m.id}`));
  }
  const probe = moments[0];
  if (probe) {
    const qs = new URLSearchParams({
      q: probe.phrase,
      t: probe.timestamp,
      snippet: probe.snippet.slice(0, 200),
    });
    out.push(await auditMomentOgPng(baseUrl, `/api/og/moment/${encodeURIComponent(probe.videoId)}?${qs}`));
  }
  return out;
}

function isAbortOrTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const msg = error.message.toLowerCase();
  return msg.includes("timeout") || msg.includes("aborted");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? "";
}

function extractMetaDescription(html: string) {
  const match = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );
  if (match?.[1]) return match[1].trim();
  const alt = html.match(
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i
  );
  return alt?.[1]?.trim() ?? "";
}

function extractCanonical(html: string) {
  const match = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i
  );
  if (match?.[1]) return match[1].trim();
  const alt = html.match(
    /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i
  );
  return alt?.[1]?.trim() ?? "";
}

function hasJsonLd(html: string) {
  return /type=["']application\/ld\+json["']/i.test(html);
}

function parseMomentCount(html: string) {
  const match = html.match(/(\d+)\s+moment(?:s)?\s+across/i);
  return match ? Number(match[1]) : 0;
}

function auditHtml(html: string, options?: { isPrioritySearch?: boolean }) {
  const checks: AuditCheck[] = [];
  const title = extractTitle(html);
  const description = extractMetaDescription(html);
  const canonical = extractCanonical(html);
  const visibleText = stripHtml(html);
  const momentCount = parseMomentCount(html);
  const showsEmptyState = html.includes(NOT_INDEXED_EMPTY_STATE);

  checks.push({
    name: "non-empty title",
    pass: title.length > 0,
    detail: title || "missing",
  });
  checks.push({
    name: "meta description",
    pass: description.length >= 40,
    detail: description ? `${description.length} chars` : "missing",
  });
  checks.push({
    name: "canonical URL",
    pass: canonical.length > 0,
    detail: canonical || "missing",
  });
  checks.push({
    name: "JSON-LD present",
    pass: hasJsonLd(html),
  });
  checks.push({
    name: "minimum visible text",
    pass: visibleText.length >= MIN_VISIBLE_TEXT,
    detail: `${visibleText.length} chars`,
  });

  if (options?.isPrioritySearch) {
    const emptyOk = momentCount === 0 && showsEmptyState;
    const emptyBad = momentCount > 0 && showsEmptyState;
    checks.push({
      name: "empty state only when no results",
      pass: !emptyBad || emptyOk,
      detail: emptyBad
        ? `shows empty state with ${momentCount} moments`
        : momentCount === 0
          ? "empty state allowed (0 moments)"
          : `${momentCount} moments`,
    });
  }

  return checks;
}

type FetchPageResult =
  | { ok: true; status: number; html: string }
  | { ok: false; timedOut: true; detail: string }
  | { ok: false; timedOut: false; status: number; html: string };

async function fetchPageOnce(
  url: string,
  timeoutMs: number
): Promise<{ response: Response; html: string }> {
  const response = await fetch(url, {
    headers: { "User-Agent": "youtube-timestamp-search-seo-audit/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const html = await response.text();
  return { response, html };
}

/**
 * Fetches a URL with per-route timeout. Retries on 502/503/504/429 within the same attempt.
 * For video routes, repeats the whole attempt (including HTTP retries) up to VIDEO_FETCH_MAX_ATTEMPTS
 * when the client hits an abort/timeout.
 */
async function fetchPage(baseUrl: string, path: string, options: { isVideo: boolean }): Promise<FetchPageResult> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const timeoutMs = options.isVideo ? FETCH_TIMEOUT_VIDEO_MS : FETCH_TIMEOUT_NORMAL_MS;
  const maxAttempts = options.isVideo ? VIDEO_FETCH_MAX_ATTEMPTS : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      let lastStatus = 0;
      let lastHtml = "";

      for (let httpTry = 0; httpTry < HTTP_ERROR_RETRY_ATTEMPTS; httpTry++) {
        const { response, html } = await fetchPageOnce(url, timeoutMs);
        lastStatus = response.status;
        lastHtml = html;

        if (lastStatus === 200) {
          return { ok: true, status: lastStatus, html: lastHtml };
        }

        if (lastStatus !== 502 && lastStatus !== 503 && lastStatus !== 504 && lastStatus !== 429) {
          return { ok: false, timedOut: false, status: lastStatus, html: lastHtml };
        }

        if (httpTry < HTTP_ERROR_RETRY_ATTEMPTS - 1) {
          await sleep(HTTP_RETRY_DELAY_MS);
        }
      }

      return { ok: false, timedOut: false, status: lastStatus, html: lastHtml };
    } catch (error) {
      lastError = error;
      const timedOut = isAbortOrTimeout(error);
      if (!options.isVideo || attempt === maxAttempts - 1) {
        if (timedOut) {
          return {
            ok: false,
            timedOut: true,
            detail: error instanceof Error ? error.message : "fetch failed",
          };
        }
        return {
          ok: false,
          timedOut: false,
          status: 0,
          html: "",
        };
      }
      await sleep(VIDEO_TIMEOUT_RETRY_DELAY_MS);
    }
  }

  return {
    ok: false,
    timedOut: true,
    detail: lastError instanceof Error ? lastError.message : "fetch failed",
  };
}

async function auditPage(
  baseUrl: string,
  path: string,
  options?: { isPrioritySearch?: boolean }
): Promise<PageAuditResult> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const isVideo = isVideoPath(path);

  let fetchResult: FetchPageResult;
  try {
    fetchResult = await fetchPage(baseUrl, path, { isVideo });
  } catch (error) {
    return {
      url,
      status: 0,
      checks: [
        {
          name: "TIMEOUT",
          pass: false,
          detail: error instanceof Error ? error.message : "fetch failed",
        },
      ],
      pass: false,
      outcome: "timed_out",
    };
  }

  if (!fetchResult.ok && fetchResult.timedOut) {
    return {
      url,
      status: 0,
      checks: [
        {
          name: "TIMEOUT",
          pass: false,
          detail: fetchResult.detail,
        },
      ],
      pass: false,
      outcome: "timed_out",
    };
  }

  if (!fetchResult.ok && !fetchResult.timedOut) {
    const status = fetchResult.status;
    const checks: AuditCheck[] = [
      {
        name: "HTTP 200",
        pass: status === 200,
        detail: String(status),
      },
    ];
    return {
      url,
      status,
      checks,
      pass: false,
      outcome: "failed_http",
    };
  }

  const { status, html } = fetchResult;
  const checks: AuditCheck[] = [
    {
      name: "HTTP 200",
      pass: status === 200,
      detail: String(status),
    },
    ...auditHtml(html, options),
  ];
  const pass = checks.every((check) => check.pass);
  return {
    url,
    status,
    checks,
    pass,
    outcome: pass ? "pass" : "failed_html",
  };
}

async function verifyRobots(baseUrl: string) {
  const result = await fetchPage(baseUrl, "/robots.txt", { isVideo: false });
  if (!result.ok && result.timedOut) {
    return {
      checks: [{ name: "robots.txt reachable", pass: false, detail: `TIMEOUT: ${result.detail}` }],
      pass: false,
    };
  }
  if (!result.ok && !result.timedOut) {
    const status = result.status;
    return {
      checks: [{ name: "robots.txt HTTP 200", pass: status === 200, detail: String(status) }],
      pass: status === 200,
    };
  }
  const { status, html } = result;
  const checks: AuditCheck[] = [
    { name: "robots.txt HTTP 200", pass: status === 200, detail: String(status) },
    {
      name: "sitemap URL exposed",
      pass: /Sitemap:\s*https?:\/\//i.test(html),
    },
    {
      name: "search routes allowed",
      pass: /Allow:\s*\/search\//i.test(html) || /Allow:\s*\/\s*$/im.test(html),
    },
    {
      name: "video routes allowed",
      pass: /Allow:\s*\/video\//i.test(html) || /Allow:\s*\/\s*$/im.test(html),
    },
    {
      name: "api blocked",
      pass: /Disallow:\s*\/api\//i.test(html),
    },
  ];
  return { checks, pass: checks.every((c) => c.pass) };
}

async function verifyAnalytics(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/analytics/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "search_query",
        query: "seo-audit-probe",
        videoId: "audit-probe",
        payload: { source: "audit-seo-pages" },
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_NORMAL_MS),
    });
    return {
      pass: response.status === 200,
      detail: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      pass: false,
      detail: error instanceof Error ? error.message : "request failed",
    };
  }
}

async function buildQualityMetrics() {
  const videoIds = await listAllIndexedVideoIds(5000);
  const searchAudits = await Promise.all(
    SEARCH_QUERY_SLUGS.map(async (slug) => {
      const phrase = phraseFromSearchSlug(slug);
      const data = await getSearchLandingData(phrase, 40, { disableTimeout: true });
      return { slug, phrase, momentCount: data.moments.length, videoCount: data.videoCount };
    })
  );

  const emptyCount = searchAudits.filter((row) => row.momentCount === 0).length;
  const thinCount = searchAudits.filter((row) => row.momentCount > 0 && row.momentCount < 3).length;
  const withResults = searchAudits.filter((row) => row.momentCount > 0).length;
  const top20 = [...searchAudits]
    .sort((a, b) => b.momentCount - a.momentCount || b.videoCount - a.videoCount)
    .slice(0, 20);

  const momentEntries = SITEMAP_INCLUDE_MOMENTS ? await buildMomentSitemapEntries() : [];
  const sitemapEstimate =
    9 +
    SEARCH_QUERY_SLUGS.length +
    videoIds.length +
    momentEntries.length +
    5 +
    220 +
    117;

  return {
    indexedVideoCount: videoIds.length,
    searchRouteCount: SEARCH_QUERY_SLUGS.length,
    emptySearchLandingCount: emptyCount,
    thinSearchLandingCount: thinCount,
    pagesWithResults: withResults,
    sitemapUrlCountEstimate: sitemapEstimate,
    momentSitemapEnabled: SITEMAP_INCLUDE_MOMENTS,
    momentSitemapCount: momentEntries.length,
    top20,
  };
}

type AuditSummaryCounts = {
  passed: number;
  failed_http: number;
  failed_html: number;
  timed_out: number;
  total: number;
};

function outcomeLabel(outcome: PageOutcome): string {
  switch (outcome) {
    case "pass":
      return "PASS";
    case "failed_http":
      return "FAIL_HTTP";
    case "failed_html":
      return "FAIL_HTML";
    case "timed_out":
      return "TIMEOUT";
    default:
      return outcome;
  }
}

function writeIndexQualityReport(
  metrics: Awaited<ReturnType<typeof buildQualityMetrics>>,
  auditSummary: AuditSummaryCounts
) {
  const lines = [
    "# Index quality report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Indexed videos | ${metrics.indexedVideoCount} |`,
    `| Priority search routes | ${metrics.searchRouteCount} |`,
    `| Search landings with results | ${metrics.pagesWithResults} |`,
    `| Empty search landings | ${metrics.emptySearchLandingCount} |`,
    `| Thin search landings (<3 moments) | ${metrics.thinSearchLandingCount} |`,
    `| Estimated sitemap URLs | ${metrics.sitemapUrlCountEstimate} |`,
    `| Moment sitemap experiment | ${metrics.momentSitemapEnabled ? "enabled" : "disabled"} |`,
    `| Moment URLs (if enabled) | ${metrics.momentSitemapCount} |`,
    `| SEO audit pages passed | ${auditSummary.passed}/${auditSummary.total} |`,
    `| SEO audit HTTP failures | ${auditSummary.failed_http} |`,
    `| SEO audit HTML / SEO failures | ${auditSummary.failed_html} |`,
    `| SEO audit client timeouts | ${auditSummary.timed_out} |`,
    "",
    "## Top 20 strongest search pages",
    "",
    "| Rank | Query | Moments | Videos |",
    "|------|-------|--------:|-------:|",
    ...metrics.top20.map((row, index) =>
      `| ${index + 1} | ${row.phrase} | ${row.momentCount} | ${row.videoCount} |`
    ),
    "",
    "## Supabase migration",
    "",
    "Apply analytics persistence migration:",
    "",
    "```bash",
    "cd supabase",
    "supabase db push",
    "```",
    "",
    "Or link project and push from repo root:",
    "",
    "```bash",
    "supabase link --project-ref <YOUR_PROJECT_REF>",
    "supabase db push",
    "```",
    "",
    "Migration file: `supabase/migrations/003_search_analytics_events.sql`",
    "",
    "## Regenerate",
    "",
    "```bash",
    "npm run audit:seo",
    "# or a fast production smoke:",
    "npm run audit:seo:quick",
    "```",
    "",
  ];

  writeFileSync(join(process.cwd(), "INDEX_QUALITY_REPORT.md"), lines.join("\n"));
}

async function buildFullAuditPaths(): Promise<Array<{ path: string; isPrioritySearch?: boolean }>> {
  const paths: Array<{ path: string; isPrioritySearch?: boolean }> = [
    { path: "/" },
    { path: "/transcripts" },
    { path: "/moments" },
    ...SEARCH_QUERY_SLUGS.map((slug) => ({
      path: `/search/${slug}`,
      isPrioritySearch: true,
    })),
  ];

  const priorityVideoPaths = SEO_PRIORITY_VIDEO_IDS.map((id) => ({
    path: buildVideoPath(id),
  }));
  paths.push(...priorityVideoPaths);

  const summaries = await listCachedTranscripts();
  const videoSample = summaries
    .filter((row) => !SEO_PRIORITY_VIDEO_IDS.includes(row.videoId))
    .slice(0, VIDEO_SAMPLE_SIZE)
    .map((row) => ({
      path: buildVideoPath(row.videoId),
    }));
  paths.push(...videoSample);

  return paths;
}

function buildQuickAuditPaths(): Array<{ path: string; isPrioritySearch?: boolean }> {
  const publicSamples = loadPublicMoments()
    .slice(0, 3)
    .map((m) => ({ path: buildPublicMomentPath(m.id, m.canonicalSlug) }));

  return [
    { path: "/" },
    { path: "/transcripts" },
    { path: "/moments" },
    ...STATIC_BUILD_SEARCH_SLUGS.map((slug) => ({
      path: `/search/${slug}`,
      isPrioritySearch: true,
    })),
    { path: "/trending" },
    { path: "/saved" },
    ...SEO_PRIORITY_VIDEO_IDS.map((id) => ({
      path: buildVideoPath(id),
    })),
    ...publicSamples,
  ];
}

function summarizeResults(results: PageAuditResult[]): AuditSummaryCounts {
  let passed = 0;
  let failed_http = 0;
  let failed_html = 0;
  let timed_out = 0;
  for (const r of results) {
    switch (r.outcome) {
      case "pass":
        passed++;
        break;
      case "failed_http":
        failed_http++;
        break;
      case "failed_html":
        failed_html++;
        break;
      case "timed_out":
        timed_out++;
        break;
      default:
        break;
    }
  }
  return { passed, failed_http, failed_html, timed_out, total: results.length };
}

async function main() {
  const quick = isQuickMode();
  const baseUrl = process.env.AUDIT_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? getSiteUrl();
  console.log(`SEO audit base URL: ${baseUrl}`);
  console.log(`Mode: ${quick ? "quick (subset)" : "full"}\n`);

  const paths = quick ? buildQuickAuditPaths() : await buildFullAuditPaths();

  const results: PageAuditResult[] = [];
  for (const entry of paths) {
    const result = await auditPage(baseUrl, entry.path, {
      isPrioritySearch: entry.isPrioritySearch,
    });
    results.push(result);
    const icon = outcomeLabel(result.outcome);
    console.log(`${icon} ${result.url}`);
    if (!result.pass) {
      for (const check of result.checks.filter((c) => !c.pass)) {
        console.log(`  - ${check.name}: ${check.detail ?? "failed"}`);
      }
    }
  }

  const robots = await verifyRobots(baseUrl);
  console.log(`\nrobots.txt: ${robots.pass ? "PASS" : "FAIL"}`);
  for (const check of robots.checks.filter((c) => !c.pass)) {
    console.log(`  - ${check.name}: ${check.detail ?? "failed"}`);
  }

  const analytics = await verifyAnalytics(baseUrl);
  console.log(`analytics /api/analytics/event: ${analytics.pass ? "PASS" : "FAIL"} (${analytics.detail})`);

  const ogResults = await auditMomentOgRoutes(baseUrl);
  for (const row of ogResults) {
    const icon = row.pass ? "PASS" : "FAIL";
    console.log(
      `${icon} [OG PNG] ${row.url} status=${row.status} ct=${row.contentType || "—"}${row.detail ? ` (${row.detail})` : ""}`
    );
  }
  const ogPass = ogResults.length === 0 ? true : ogResults.every((row) => row.pass);

  const counts = summarizeResults(results);
  console.log(
    `\nPage summary: ${counts.passed} passed, ${counts.failed_http} failed_http, ${counts.failed_html} failed_html, ${counts.timed_out} timed_out (${counts.total} pages)`
  );

  if (quick) {
    console.log("\nQuick audit: skipped INDEX_QUALITY_REPORT.md (run full `npm run audit:seo` to regenerate).");
  } else {
    const metrics = await buildQualityMetrics();
    writeIndexQualityReport(metrics, counts);
    console.log(`\nEmpty search landings: ${metrics.emptySearchLandingCount}`);
    console.log(`Thin search landings: ${metrics.thinSearchLandingCount}`);
    console.log(`Estimated sitemap URLs: ${metrics.sitemapUrlCountEstimate}`);
    console.log("Wrote INDEX_QUALITY_REPORT.md");
  }

  const blockingPageFailures = counts.failed_http > 0 || counts.failed_html > 0;
  const hardFail = blockingPageFailures || !robots.pass || !analytics.pass || !ogPass;
  if (counts.timed_out > 0 && !blockingPageFailures) {
    console.log(
      "\nNote: one or more pages hit TIMEOUT (slow HTML or client deadline). Treat as signal, not missing SEO tags."
    );
  }

  process.exit(hardFail ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
