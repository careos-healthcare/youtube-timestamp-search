import Link from "next/link";

import { FEATURED_TOPIC_KEYWORDS, formatTopicLabel } from "@/lib/topic-keywords";
import { buildTopicPath } from "@/lib/seo";

export function PopularTopicSearches() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white sm:text-xl">Popular transcript searches</h2>
          <p className="mt-1 text-sm text-slate-300">
            Explore high-intent topics people search for inside YouTube transcripts.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_TOPIC_KEYWORDS.map((keyword) => (
            <Link
              key={keyword}
              href={buildTopicPath(keyword)}
              className="group rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-slate-950/60 to-slate-950/80 p-4 transition hover:border-blue-300/40 hover:from-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10"
            >
              <p className="text-sm font-semibold text-white group-hover:text-blue-100">
                {formatTopicLabel(keyword)}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400 group-hover:text-slate-300">
                Search transcript moments, quotes, and timestamps
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
