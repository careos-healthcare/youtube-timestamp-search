import Link from "next/link";

import { buildCreatorPath, buildCreatorsIndexPath } from "@/lib/seo";
import { getFeaturedCreatorsByCategory } from "@/lib/creator-data";

export function FeaturedCreators() {
  const groups = getFeaturedCreatorsByCategory(2);

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 via-white/5 to-slate-950/80 p-4 sm:p-5">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">Popular creator transcript searches</h2>
            <p className="mt-1 text-sm text-slate-300">
              Search podcast and interview transcripts by creator — timestamps, quotes, and clips.
            </p>
          </div>
          <Link
            href={buildCreatorsIndexPath()}
            className="inline-flex h-10 items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-medium text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-500/20"
          >
            Browse all creators
          </Link>
        </div>

        {groups.map((group) => (
          <div key={group.category} className="space-y-3">
            <h3 className="text-xs font-semibold tracking-[0.18em] text-violet-200/70 uppercase">
              {group.label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.creators.map((creator) => (
                <Link
                  key={creator.slug}
                  href={buildCreatorPath(creator.slug)}
                  className="group rounded-2xl border border-violet-400/20 bg-slate-950/50 p-4 transition hover:border-violet-300/40 hover:bg-violet-500/10 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <p className="text-sm font-semibold text-white group-hover:text-violet-100">
                    {creator.displayName}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400 group-hover:text-slate-300">
                    {creator.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
