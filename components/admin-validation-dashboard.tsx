"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { ValidationMetrics } from "@/lib/validation-metrics";
import { buildVideoPath } from "@/lib/seo";

type AdminValidationDashboardProps = {
  initialMetrics: ValidationMetrics;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </article>
  );
}

export function AdminValidationDashboard({ initialMetrics }: AdminValidationDashboardProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState(initialMetrics);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zeroResultRate =
    metrics.analytics.totalSearchEvents > 0
      ? metrics.analytics.zeroResultSearches / metrics.analytics.totalSearchEvents
      : 0;

  const feedbackTotal = metrics.analytics.feedbackYes + metrics.analytics.feedbackNo;
  const feedbackYesRate = feedbackTotal > 0 ? metrics.analytics.feedbackYes / feedbackTotal : 0;

  async function refreshMetrics() {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/validation", { cache: "no-store" });
      if (!response.ok) {
        setError("Could not refresh metrics");
        return;
      }

      const body = (await response.json()) as ValidationMetrics;
      setMetrics(body);
    } catch {
      setError("Could not refresh metrics");
    } finally {
      setRefreshing(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Phase 4</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Launch validation dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Search demand and usefulness proof for the public video knowledge engine.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Generated {new Date(metrics.generatedAt).toLocaleString()} · cache mode:{" "}
              {metrics.cacheMode} · analytics source: {metrics.analytics.source}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshMetrics()}
              disabled={refreshing}
              className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-4 text-sm font-medium text-blue-100 disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-200"
            >
              Sign out
            </button>
          </div>
        </header>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Indexed videos"
            value={formatNumber(metrics.indexedVideos)}
            hint="Public transcript index size"
          />
          <MetricCard
            label="Searchable segments"
            value={formatNumber(metrics.searchableSegments)}
            hint="Caption segments available for search"
          />
          <MetricCard
            label="Search events"
            value={formatNumber(metrics.analytics.totalSearchEvents)}
            hint="homepage, query, and index searches"
          />
          <MetricCard
            label="Zero-result searches"
            value={formatNumber(metrics.analytics.zeroResultSearches)}
            hint={`${(zeroResultRate * 100).toFixed(1)}% of search events`}
          />
          <MetricCard
            label="YouTube timestamp clicks"
            value={formatNumber(metrics.analytics.youtubeTimestampClicks)}
            hint="Opens and result clicks to YouTube"
          />
          <MetricCard
            label="Feedback yes"
            value={formatNumber(metrics.analytics.feedbackYes)}
            hint={
              feedbackTotal > 0
                ? `${(feedbackYesRate * 100).toFixed(1)}% positive of ${feedbackTotal} responses`
                : "No feedback yet"
            }
          />
          <MetricCard
            label="Feedback no"
            value={formatNumber(metrics.analytics.feedbackNo)}
            hint="Did this find the right moment?"
          />
          <MetricCard
            label="Usefulness signal"
            value={feedbackTotal > 0 ? `${(feedbackYesRate * 100).toFixed(0)}% yes` : "—"}
            hint="Primary MVP usefulness metric"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Top 25 queries</h2>
            {metrics.analytics.topQueries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No persisted search queries yet.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {metrics.analytics.topQueries.map((item, index) => (
                  <li
                    key={`${item.query}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-slate-200">
                      {index + 1}. {item.query}
                    </span>
                    <span className="shrink-0 text-slate-400">{formatNumber(item.count)}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Top 25 clicked videos</h2>
            {metrics.analytics.topVideos.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No persisted video click events yet.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {metrics.analytics.topVideos.map((item, index) => (
                  <li
                    key={`${item.videoId}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-sm"
                  >
                    <a
                      href={buildVideoPath(item.videoId)}
                      className="truncate text-blue-200 hover:text-blue-100"
                    >
                      {index + 1}. {item.videoId}
                    </a>
                    <span className="shrink-0 text-slate-400">{formatNumber(item.count)}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
