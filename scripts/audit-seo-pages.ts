#!/usr/bin/env tsx
/**
 * SEO health audit for crawlable public pages.
 *
 * Usage:
 *   npm run audit:seo
 *   AUDIT_BASE_URL=http://localhost:3000 npm run audit:seo
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { listCachedTranscripts } from "../lib/transcript-cache";
import { NOT_INDEXED_EMPTY_STATE } from "../lib/empty-state-copy";
import { SEARCH_QUERY_SLUGS, phraseFromSearchSlug } from "../lib/search-query-seeds";
import { getSearchLandingData } from "../lib/search-landing-engine";
import { buildMomentSitemapEntries } from "../lib/moment-sitemap";
import { SITEMAP_INCLUDE_MOMENTS } from "../lib/sitemap-config";
import { listAllIndexedVideoIds } from "../lib/indexed-videos";
import { getSiteUrl, buildVideoPath } from "../lib/seo";

const MIN_VISIBLE_TEXT = 200;
const VIDEO_SAMPLE_SIZE = 20;

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
};

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

async function fetchPage(baseUrl: string, path: string): Promise<{ status: number; html: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "youtube-timestamp-search-seo-audit/1.0" },
  });
  const html = await response.text();
  return { status: response.status, html };
}

async function auditPage(
  baseUrl: string,
  path: string,
  options?: { isPrioritySearch?: boolean }
): Promise<PageAuditResult> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  let status = 0;
  let html = "";

  try {
    const result = await fetchPage(baseUrl, path);
    status = result.status;
    html = result.html;
  } catch (error) {
    return {
      url,
      status: 0,
      checks: [
        {
          name: "fetch",
          pass: false,
          detail: error instanceof Error ? error.message : "fetch failed",
        },
      ],
      pass: false,
    };
  }

  const checks: AuditCheck[] = [
    {
      name: "HTTP 200",
      pass: status === 200,
      detail: String(status),
    },
    ...auditHtml(html, options),
  ];

  return {
    url,
    status,
    checks,
    pass: checks.every((check) => check.pass),
  };
}

async function verifyRobots(baseUrl: string) {
  const { status, html } = await fetchPage(baseUrl, "/robots.txt");
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
      const data = await getSearchLandingData(phrase);
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

function writeIndexQualityReport(
  metrics: Awaited<ReturnType<typeof buildQualityMetrics>>,
  auditSummary: { passed: number; failed: number; total: number }
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
    `| SEO audit pass rate | ${auditSummary.passed}/${auditSummary.total} |`,
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
    "```",
    "",
  ];

  writeFileSync(join(process.cwd(), "INDEX_QUALITY_REPORT.md"), lines.join("\n"));
}

async function main() {
  const baseUrl = process.env.AUDIT_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? getSiteUrl();
  console.log(`SEO audit base URL: ${baseUrl}\n`);

  const paths: Array<{ path: string; isPrioritySearch?: boolean }> = [
    { path: "/" },
    { path: "/transcripts" },
    ...SEARCH_QUERY_SLUGS.map((slug) => ({
      path: `/search/${slug}`,
      isPrioritySearch: true,
    })),
  ];

  const summaries = await listCachedTranscripts();
  const videoSample = summaries.slice(0, VIDEO_SAMPLE_SIZE).map((row) => ({
    path: buildVideoPath(row.videoId),
  }));
  paths.push(...videoSample);

  const results: PageAuditResult[] = [];
  for (const entry of paths) {
    const result = await auditPage(baseUrl, entry.path, {
      isPrioritySearch: entry.isPrioritySearch,
    });
    results.push(result);
    const icon = result.pass ? "PASS" : "FAIL";
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
    console.log(`  - ${check.name}`);
  }

  const analytics = await verifyAnalytics(baseUrl);
  console.log(`analytics /api/analytics/event: ${analytics.pass ? "PASS" : "FAIL"} (${analytics.detail})`);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  const metrics = await buildQualityMetrics();
  writeIndexQualityReport(metrics, { passed, failed, total: results.length });

  console.log(`\nAudited ${results.length} pages: ${passed} passed, ${failed} failed`);
  console.log(`Empty search landings: ${metrics.emptySearchLandingCount}`);
  console.log(`Thin search landings: ${metrics.thinSearchLandingCount}`);
  console.log(`Estimated sitemap URLs: ${metrics.sitemapUrlCountEstimate}`);
  console.log("Wrote INDEX_QUALITY_REPORT.md");

  const allPass = failed === 0 && robots.pass;
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
