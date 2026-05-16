import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaSection } from "@/components/cta-section";
import { InternalLinksPanel } from "@/components/internal-links-panel";
import { TopicClusterLiveSection } from "@/components/topic-cluster-live-section";
import { TopicIntelligenceHubSection } from "@/components/topic-intelligence-hub-section";
import { TopicPageViewTracker } from "@/components/topic-page-view-tracker";
import { ResearchAnswerPublicSection } from "@/components/research-answer-public-section";
import { CompareExplanationsSection } from "@/components/compare-explanations-section";
import { comparePublicMomentsForTopic } from "@/lib/research/compare-explanations";
import { getTopicClusterData } from "@/lib/topic-cluster-engine";
import { buildInternalLinkGraph } from "@/lib/internal-linking";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { SearchForm } from "@/components/search-form";
import {
  buildSearchPath,
  buildTopicPath,
  buildTopicsIndexPath,
  buildCreatorPath,
  buildCreatorsIndexPath,
  createTopicMetadata,
} from "@/lib/seo";
import { buildTopicContent } from "@/lib/topic-content";
import { getCreatorsForTopic } from "@/lib/creator-data";
import { formatTopicLabel, isTopicKeyword, normalizeTopicSlug } from "@/lib/topic-keywords";
import { getTopicHubBySlug } from "@/lib/topics/topic-index";
import { buildTopicIntelligenceJsonLd } from "@/lib/topics/topic-jsonld";
import { createTopicIntelligenceMetadata } from "@/lib/topics/topic-seo";

type TopicPageProps = {
  params: Promise<{ keyword: string }>;
};

export const revalidate = 300;
export const dynamicParams = true;

/** Skip topic pre-render at build; ISR fills from traffic (`revalidate`). */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { keyword: rawKeyword } = await params;
  const slug = normalizeTopicSlug(rawKeyword);
  const hub = getTopicHubBySlug(slug);
  const seed = isTopicKeyword(slug);

  if (!seed && !hub) {
    return { title: "Topic | YouTube Time Search" };
  }
  if (!seed && hub) {
    return createTopicIntelligenceMetadata(hub);
  }
  if (seed && hub) {
    const base = createTopicMetadata(slug);
    if (hub.quality === "thin") {
      return {
        ...base,
        robots: { index: false, follow: true },
      };
    }
    return base;
  }
  return createTopicMetadata(slug);
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { keyword: rawKeyword } = await params;
  const slug = normalizeTopicSlug(rawKeyword);
  const hub = getTopicHubBySlug(slug);
  const seed = isTopicKeyword(slug);

  if (!seed && !hub) {
    notFound();
  }

  const jsonLd = hub ? buildTopicIntelligenceJsonLd(hub) : null;

  if (!seed && hub) {
    return (
      <PageShell>
        <TopicPageViewTracker
          topicSlug={slug}
          mode="intelligence"
          momentCount={hub.moments.length}
          quality={hub.quality}
        />
        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
        <section className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur sm:p-6 lg:p-8">
          <div className="flex max-w-3xl flex-col gap-4">
            <span className="inline-flex w-fit rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-emerald-100 uppercase">
              Topic research hub
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">{hub.displayTitle}</h1>
            <p className="text-sm leading-7 text-slate-200 sm:text-lg">{hub.description}</p>
            <SearchForm initialPhrase={hub.displayTitle} compact />
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <Link className="text-emerald-200 hover:text-emerald-100" href={buildTopicsIndexPath()}>
                All topics
              </Link>
              <Link className="text-emerald-200 hover:text-emerald-100" href={buildSearchPath(hub.displayTitle)}>
                Search this topic
              </Link>
            </div>
          </div>
        </section>

        <TopicIntelligenceHubSection hub={hub} />

        {hub.moments.length >= 3 ? (
          <>
            <ResearchAnswerPublicSection queryLabel={hub.displayTitle} topicSlug={hub.slug} moments={hub.moments} />
            <CompareExplanationsSection
              variant="public"
              topicSlug={hub.slug}
              queryLabel={hub.displayTitle}
              rows={comparePublicMomentsForTopic(hub.moments, hub.displayTitle, 6)}
            />
          </>
        ) : null}

        <CtaSection />
        <SiteFooter />
      </PageShell>
    );
  }

  const content = buildTopicContent(slug);
  const relatedCreators = getCreatorsForTopic(slug, 6);
  const clusterData = await getTopicClusterData(slug);
  const internalLinks = buildInternalLinkGraph({
    phrase: clusterData?.searchPhrase ?? content.label,
    topVideos: clusterData?.landing.topVideos,
  });

  return (
    <PageShell>
      <TopicPageViewTracker
        topicSlug={slug}
        mode="seed"
        momentCount={hub?.moments.length ?? 0}
        quality={hub?.quality}
      />
      {hub && hub.quality === "hub" ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildTopicIntelligenceJsonLd(hub)) }}
        />
      ) : null}
      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-white/5 to-slate-950/80 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit rounded-full border border-blue-300/30 bg-blue-400/15 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              {content.clusterLabel}
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Search YouTube transcripts for {content.label.toLowerCase()} moments
            </h1>
            <p className="text-sm leading-7 text-slate-200 sm:text-lg">{content.intro}</p>
          </div>

          <SearchForm initialPhrase={slug} compact />

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Why search transcripts for {content.label.toLowerCase()}?</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{content.explanation}</p>
          </div>
        </div>
      </section>

      {clusterData ? <TopicClusterLiveSection data={clusterData} /> : null}

      {hub ? <TopicIntelligenceHubSection hub={hub} /> : null}

      {hub && hub.moments.length >= 3 ? (
        <>
          <ResearchAnswerPublicSection queryLabel={hub.displayTitle} topicSlug={hub.slug} moments={hub.moments} />
          <CompareExplanationsSection
            variant="public"
            topicSlug={hub.slug}
            queryLabel={hub.displayTitle}
            rows={comparePublicMomentsForTopic(hub.moments, hub.displayTitle, 6)}
          />
        </>
      ) : null}

      <InternalLinksPanel
        relatedPhrases={internalLinks.relatedPhrases}
        relatedTopics={internalLinks.relatedTopics}
        relatedVideos={internalLinks.relatedVideos}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Popular searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.popularSearches.map((search) => (
              <Link
                key={search}
                href={buildSearchPath(search)}
                className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-500/20"
              >
                {search}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Use cases</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            {content.useCases.map((useCase) => (
              <li key={useCase} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
                {useCase}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">FAQ</h2>
        <div className="mt-4 grid gap-3">
          {content.faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 transition hover:border-blue-400/20"
            >
              <h3 className="text-sm font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related transcript searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.relatedPhrases.map((phrase) => (
              <Link
                key={phrase}
                href={buildSearchPath(phrase)}
                className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-200 transition hover:border-blue-300/30 hover:bg-blue-500/10 hover:text-blue-100"
              >
                {phrase}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">People also search for</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.alsoSearchFor.map((phrase) => (
              <Link
                key={phrase}
                href={buildSearchPath(phrase)}
                className="inline-flex h-9 items-center rounded-full border border-white/10 bg-slate-950/50 px-3 text-sm text-slate-200 transition hover:border-blue-300/30 hover:bg-blue-500/10 hover:text-blue-100"
              >
                {phrase}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Explore more topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.relatedTopics.map((topic) => (
              <Link
                key={topic}
                href={buildTopicPath(topic)}
                className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/20"
              >
                {formatTopicLabel(topic)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Creators to search for {content.label.toLowerCase()}</h2>
        <p className="mt-2 text-sm text-slate-400">
          Jump to creator transcript search pages connected to this topic.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {relatedCreators.map((creator) => (
            <Link
              key={creator.slug}
              href={buildCreatorPath(creator.slug)}
              className="inline-flex h-9 items-center rounded-full border border-violet-400/20 bg-violet-400/10 px-3 text-sm text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-400/20"
            >
              {creator.displayName}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">More ways to search</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={buildTopicsIndexPath()} className="text-blue-200 transition hover:text-blue-100">
            Browse all topics
          </Link>
          <Link href={buildCreatorsIndexPath()} className="text-blue-200 transition hover:text-blue-100">
            Browse creators
          </Link>
          <Link href="/" className="text-blue-200 transition hover:text-blue-100">
            Homepage search
          </Link>
          <Link href="/find-youtube-quotes" className="text-blue-200 transition hover:text-blue-100">
            Find YouTube quotes
          </Link>
          <Link href="/search-podcast-transcripts" className="text-blue-200 transition hover:text-blue-100">
            Search podcast transcripts
          </Link>
          <Link href="/find-youtube-timestamps" className="text-blue-200 transition hover:text-blue-100">
            Find YouTube timestamps
          </Link>
          <Link href="/search-youtube-captions" className="text-blue-200 transition hover:text-blue-100">
            Search YouTube captions
          </Link>
        </div>
      </section>

      <CtaSection />
      <SiteFooter />
    </PageShell>
  );
}
