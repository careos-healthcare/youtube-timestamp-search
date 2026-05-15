import type { Metadata } from "next";
import { Suspense } from "react";

import { PageShell, SiteFooter } from "@/components/page-shell";
import { getTranscriptCategoryBySlug } from "@/lib/category-data";
import { getIndexedVideoById, getYouTubeThumbnailUrl } from "@/lib/indexed-videos";
import { createVideoMetadata } from "@/lib/seo";
import { buildVideoStructuredData, getCategoryLabelForSlug } from "@/lib/video-structured-data";

import { VideoPageHeavy } from "./video-page-heavy";
import { VideoPageHeavyFallback, VideoPageShell } from "./video-page-shell";

export const revalidate = 60;
export const maxDuration = 60;

type VideoPageProps = {
  params: Promise<{ videoId: string }>;
};

export async function generateMetadata({ params }: VideoPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const indexed = await getIndexedVideoById(videoId);

  return createVideoMetadata(videoId, {
    title: indexed?.title,
    channelName: indexed?.channelName,
    thumbnailUrl: getYouTubeThumbnailUrl(videoId),
    segmentCount: indexed?.segmentCount,
    description: indexed?.title
      ? `Search inside this indexed long-form video: "${indexed.title}"${indexed.channelName ? ` from ${indexed.channelName}` : ""}. Browse preview sections, searchable moments, and jump to exact timestamps.`
      : undefined,
  });
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { videoId } = await params;
  const indexed = await getIndexedVideoById(videoId);

  const categorySlug = indexed?.category;
  const category = categorySlug ? getTranscriptCategoryBySlug(categorySlug) : undefined;
  const categoryLabel = category?.label ?? (categorySlug ? getCategoryLabelForSlug(categorySlug) : undefined);

  const structuredData = buildVideoStructuredData(
    {
      videoId,
      title: indexed?.title ?? `YouTube video ${videoId}`,
      description: `Searchable YouTube transcript for ${indexed?.title ?? videoId}${indexed?.channelName ? ` from ${indexed.channelName}` : ""}.`,
      channelName: indexed?.channelName,
      fetchedAt: indexed?.fetchedAt,
      segmentCount: indexed?.segmentCount,
      categoryLabel,
    },
    { discussedTopics: [] }
  );

  const structuredDataJson = JSON.stringify(structuredData);

  return (
    <PageShell>
      <VideoPageShell videoId={videoId} indexed={indexed} structuredDataJson={structuredDataJson} />

      <Suspense fallback={<VideoPageHeavyFallback />}>
        <VideoPageHeavy videoId={videoId} indexed={indexed} />
      </Suspense>

      <SiteFooter />
    </PageShell>
  );
}
