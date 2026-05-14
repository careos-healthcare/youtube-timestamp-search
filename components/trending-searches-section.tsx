import Link from "next/link";

import type { TrendingSearchesData } from "@/lib/trending-searches";

type TrendingSearchesSectionProps = {
  data: TrendingSearchesData;
};

export function TrendingSearchesSection({ data }: TrendingSearchesSectionProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Trending searches</h2>
        <p className="mt-1 text-xs text-slate-400">Source: {data.source}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.trending.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-500/10 px-3 text-sm text-violet-100"
            >
              {item.query}
            </Link>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Newest searchable topics</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.newestTopics.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-sm text-cyan-100"
            >
              {item.query}
            </Link>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Fastest-growing searches</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.fastestGrowing.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-3 text-sm text-amber-100"
            >
              {item.query}
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}
