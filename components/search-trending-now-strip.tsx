import Link from "next/link";

import { getTrendingSearches } from "@/lib/trending-searches";

export async function SearchTrendingNowStrip() {
  const data = await getTrendingSearches();
  const chips = data.trending.slice(0, 10);
  if (chips.length === 0) return null;

  return (
    <section className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-white">Trending now</h2>
        <Link href="/trending" className="text-xs font-medium text-fuchsia-100 hover:text-white sm:text-sm">
          Open discovery hub →
        </Link>
      </div>
      <p className="mt-1 text-xs text-slate-400">What people are searching this week when analytics is available.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-slate-100 hover:bg-white/10 sm:text-sm"
          >
            <span className="font-medium">{row.label ?? row.query}</span>
            {row.count > 0 ? (
              <span className="ml-2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                {row.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
