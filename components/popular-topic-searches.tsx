import Link from "next/link";

import { buildTopicPath, buildTopicsIndexPath } from "@/lib/seo";
import { getFeaturedTopicsByCluster } from "@/lib/topic-keywords";

export function PopularTopicSearches() {
  const groups = getFeaturedTopicsByCluster(3);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white sm:text-xl">Popular transcript searches</h2>
            <p className="mt-1 text-sm text-slate-300">
              High-intent topics people search inside YouTube transcripts — grouped by category.
            </p>
          </div>
          <Link
            href={buildTopicsIndexPath()}
            className="inline-flex h-10 items-center rounded-full border border-blue-400/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-100 transition hover:border-blue-300/50 hover:bg-blue-500/20"
          >
            Browse all topics
          </Link>
        </div>

        {groups.map((group) => (
          <div key={group.cluster} className="space-y-3">
            <h3 className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              {group.label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.topics.map((topic) => (
                <Link
                  key={topic.slug}
                  href={buildTopicPath(topic.slug)}
                  className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-slate-950/60 to-slate-950/80 p-4 transition hover:border-blue-300/40 hover:from-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10"
                >
                  <p className="text-sm font-semibold text-white group-hover:text-blue-100">
                    {topic.displayName}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400 group-hover:text-slate-300">
                    {topic.description}
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
