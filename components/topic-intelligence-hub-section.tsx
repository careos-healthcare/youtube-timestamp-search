import type { TopicHub } from "@/lib/topics/topic-hub-types";
import { TopicAnalyticsLink } from "@/components/topic-analytics-link";
import { MomentQualitySignals } from "@/components/moment-quality-signals";
import { formatTopicLabel } from "@/lib/topic-keywords";
import { evaluatePublicMoment } from "@/lib/quality";
import {
  buildCreatorPath,
  buildMomentsIndexPath,
  buildPublicMomentPath,
  buildSearchPath,
  buildTopicPath,
  buildVideoPath,
} from "@/lib/seo";

export function TopicIntelligenceHubSection(props: { hub: TopicHub }) {
  const { hub } = props;
  const slug = hub.slug;
  const badge =
    hub.quality === "hub" ? "High-signal research hub" : "Exploratory topic (thin index)";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200/90">{badge}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Best transcript moments</h2>
            <p className="mt-2 text-sm text-slate-300">
              Canonical moments ranked from the public index — preferring multi-word, semantic excerpts
              where available.
            </p>
          </div>
          <TopicAnalyticsLink
            kind="related"
            topicSlug={slug}
            href={buildMomentsIndexPath()}
            className="text-sm text-emerald-200 hover:text-emerald-100"
          >
            Browse all moments →
          </TopicAnalyticsLink>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {hub.moments.slice(0, 12).map((m) => {
            const quality = evaluatePublicMoment(m);
            return (
            <li
              key={m.id}
              className="rounded-xl border border-white/10 bg-slate-950/50 p-3 transition hover:border-emerald-400/30"
            >
              <TopicAnalyticsLink
                kind="moment"
                topicSlug={slug}
                href={buildPublicMomentPath(m.id, m.canonicalSlug)}
                momentId={m.id}
                className="block"
              >
                <p className="text-sm font-semibold text-white line-clamp-2">{m.phrase}</p>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{m.videoTitle}</p>
                <p className="mt-2 text-xs text-slate-500">{m.timestamp}</p>
              </TopicAnalyticsLink>
              <div className="mt-2 border-t border-white/5 pt-2">
                <MomentQualitySignals
                  evaluation={quality}
                  momentId={m.id}
                  videoId={m.videoId}
                  phrase={m.phrase}
                  surface="topic_hub"
                  compact
                />
              </div>
            </li>
          );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Videos discussing this topic</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {hub.videos.map((v) => (
            <li key={v.videoId} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <TopicAnalyticsLink
                kind="related"
                topicSlug={slug}
                href={buildVideoPath(v.videoId)}
                className="block"
              >
                <p className="text-sm font-medium text-white line-clamp-2">{v.title}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {v.momentCount} indexed moment{v.momentCount === 1 ? "" : "s"}
                  {v.channelName ? ` · ${v.channelName}` : ""}
                </p>
              </TopicAnalyticsLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {hub.relatedTopicSlugs.length === 0 ? (
              <p className="text-sm text-slate-400">More hubs appear as the index grows.</p>
            ) : (
              hub.relatedTopicSlugs.map((t) => (
                <TopicAnalyticsLink
                  key={t}
                  kind="related"
                  topicSlug={slug}
                  href={buildTopicPath(t)}
                  className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/20"
                >
                  {formatTopicLabel(t)}
                </TopicAnalyticsLink>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {hub.relatedSearches.map((q) => (
              <TopicAnalyticsLink
                key={q}
                kind="search"
                topicSlug={slug}
                href={buildSearchPath(q)}
                className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-500/20"
              >
                {q}
              </TopicAnalyticsLink>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Creators discussing this topic</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {hub.creators.length === 0 ? (
            <p className="text-sm text-slate-400">No mapped creator profiles for these moments yet.</p>
          ) : (
            hub.creators.map((c) => (
              <TopicAnalyticsLink
                key={c.slug}
                kind="creator"
                topicSlug={slug}
                href={buildCreatorPath(c.slug)}
                className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 text-sm text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-400/20"
              >
                {c.displayName}
              </TopicAnalyticsLink>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Continue researching</h2>
        <p className="mt-2 text-sm text-slate-300">
          Jump into search, other hubs, and the public moment index to go deeper in-session.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <TopicAnalyticsLink
            kind="search"
            topicSlug={slug}
            href={buildSearchPath(hub.displayTitle)}
            className="inline-flex h-9 items-center rounded-full border border-blue-400/30 bg-blue-500/15 px-3 text-sm text-blue-100"
          >
            Search “{hub.displayTitle}”
          </TopicAnalyticsLink>
          {hub.relatedTopicSlugs.slice(0, 4).map((t) => (
            <TopicAnalyticsLink
              key={`c-${t}`}
              kind="related"
              topicSlug={slug}
              href={buildTopicPath(t)}
              className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-200 hover:border-blue-300/30"
            >
              Open {formatTopicLabel(t)}
            </TopicAnalyticsLink>
          ))}
        </div>
      </section>
    </div>
  );
}
