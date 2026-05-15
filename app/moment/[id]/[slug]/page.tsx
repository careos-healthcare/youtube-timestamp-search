import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import {
  CanonicalMomentPageViewTracker,
  CanonicalMomentRelatedList,
  CanonicalMomentYoutubeCta,
} from "@/components/canonical-moment-client";
import { MomentSharePanel } from "@/components/moment-share-panel";
import { PageShell, SiteFooter } from "@/components/page-shell";
import { SaveMomentButton } from "@/components/save-moment-button";
import { ShareActions } from "@/components/share-actions";
import { getIndexedVideoById } from "@/lib/indexed-videos";
import {
  getPublicMomentById,
  isPublicMomentRecordConsistent,
  loadPublicMoments,
} from "@/lib/moments/load-public-moments";
import { getRelatedPublicMoments } from "@/lib/moments/public-moment-related";
import { isPublicMomentId } from "@/lib/moments/stable-id";
import { buildPublicMomentOgImageUrl, buildTrackedPublicMomentPageUrl } from "@/lib/og-urls";
import { buildPublicMomentStructuredData } from "@/lib/site-structured-data";
import { hybridFindMatches } from "@/lib/search/per-video-hybrid-search";
import {
  buildMomentPath,
  buildPublicMomentPath,
  buildPublicMomentUrl,
  buildSearchPath,
  buildTranscriptsIndexPath,
  createPublicMomentMetadata,
} from "@/lib/seo";
import { fetchTranscriptByVideoId, TranscriptFetchError } from "@/lib/transcript-service";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ id: string; slug: string }>;
};

export async function generateStaticParams() {
  return loadPublicMoments().map((m) => ({
    id: m.id,
    slug: m.canonicalSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const row = getPublicMomentById(id);
  if (!row) {
    return { title: "Moment not found", robots: { index: false, follow: false } };
  }
  return createPublicMomentMetadata(row);
}

export default async function CanonicalMomentPage({ params }: PageProps) {
  const { id, slug } = await params;

  if (!isPublicMomentId(id)) {
    notFound();
  }

  const row = getPublicMomentById(id);
  if (!row || !isPublicMomentRecordConsistent(row)) {
    notFound();
  }

  if (slug !== row.canonicalSlug) {
    permanentRedirect(buildPublicMomentPath(row.id, row.canonicalSlug));
  }

  const indexed = await getIndexedVideoById(row.videoId);
  const videoTitle = row.videoTitle ?? indexed?.title ?? `Video ${row.videoId}`;
  const channelName = row.channelName ?? indexed?.channelName;

  let snippet = row.snippet;
  let timestamp = row.timestamp;
  let youtubeUrl = row.youtubeUrl;

  try {
    const transcript = await fetchTranscriptByVideoId(row.videoId);
    const hits = hybridFindMatches(row.videoId, transcript, row.phrase);
    const top = hits[0];
    if (top) {
      snippet = top.snippet;
      timestamp = top.timestamp;
      youtubeUrl = top.openUrl;
    }
  } catch (error) {
    if (!(error instanceof TranscriptFetchError)) {
      // keep materialized fallbacks
    }
  }

  const all = loadPublicMoments();
  const related = getRelatedPublicMoments(row, all, 6);
  const structuredData = buildPublicMomentStructuredData({ ...row, snippet, timestamp, youtubeUrl });
  const canonicalPath = buildPublicMomentPath(row.id, row.canonicalSlug);
  const canonicalUrl = buildPublicMomentUrl(row.id, row.canonicalSlug);

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CanonicalMomentPageViewTracker
        momentId={row.id}
        videoId={row.videoId}
        phraseLength={row.phrase.length}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-wide text-violet-200/90">Indexed transcript moment</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              &quot;{row.phrase}&quot;{" "}
              <span className="text-slate-300">in {videoTitle}</span>
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              Bookmarkable canonical page with transcript excerpt and timestamp link. Opens on YouTube — no
              rehosting.
            </p>
          </div>

          <article className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 sm:p-5">
            <div className="mb-3 inline-flex w-fit rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
              {timestamp}
            </div>
            <blockquote className="text-base leading-8 text-slate-100 sm:text-lg">{snippet}</blockquote>
          </article>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <CanonicalMomentYoutubeCta
              href={youtubeUrl}
              videoId={row.videoId}
              momentId={row.id}
              phrase={row.phrase}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-medium text-blue-100 transition hover:bg-blue-400/20"
            >
              Open on YouTube
            </CanonicalMomentYoutubeCta>
            <SaveMomentButton
              query={row.phrase}
              videoId={row.videoId}
              title={videoTitle}
              channel={channelName}
              timestamp={timestamp}
              snippet={snippet}
              youtubeUrl={youtubeUrl}
              momentPageUrl={canonicalPath}
            />
            <ShareActions shareUrl={canonicalUrl} label="Share moment" />
          </div>
        </div>
      </section>

      <MomentSharePanel
        videoId={row.videoId}
        phrase={row.phrase}
        videoTitle={videoTitle}
        channelName={channelName}
        trackedMomentPageUrl={buildTrackedPublicMomentPageUrl(row.id, row.canonicalSlug, "copy", "copy")}
        momentOgImageUrl={buildPublicMomentOgImageUrl(row.id)}
        viralMomentPageUrl={canonicalUrl}
        topResult={{
          snippet,
          timestamp,
          youtubeUrl,
          startSeconds: row.startSeconds,
        }}
      />

      {related.length > 0 ? (
        <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related moments</h2>
          <p className="mt-1 text-sm text-slate-400">
            Curated picks from the same video, phrase, or channel — no embeddings.
          </p>
          <CanonicalMomentRelatedList
            currentId={row.id}
            items={related.map((m) => ({
              id: m.id,
              canonicalSlug: m.canonicalSlug,
              phrase: m.phrase,
              videoTitle: m.videoTitle,
              videoId: m.videoId,
              timestamp: m.timestamp,
            }))}
          />
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Explore further</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-blue-200">
          <li>
            <Link href={`/video/${row.videoId}`} className="hover:text-blue-100">
              Full transcript for this video
            </Link>
          </li>
          <li>
            <Link href={buildSearchPath(row.phrase)} className="hover:text-blue-100">
              Search &quot;{row.phrase}&quot; across indexed videos
            </Link>
          </li>
          <li>
            <Link href={buildMomentPath(row.videoId, row.phrase)} className="hover:text-blue-100">
              Legacy moment URL (query-based)
            </Link>
          </li>
          <li>
            <Link href={buildTranscriptsIndexPath()} className="hover:text-blue-100">
              Public transcript index
            </Link>
          </li>
          <li>
            <Link href="/trending" className="hover:text-blue-100">
              Trending discovery
            </Link>
          </li>
        </ul>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
