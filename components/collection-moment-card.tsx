"use client";

import Link from "next/link";

import { MomentQualitySignals } from "@/components/moment-quality-signals";
import { SaveMomentButton } from "@/components/save-moment-button";
import { SourceAuthorityBadge } from "@/components/source-authority-badge";
import { trackPersistentEvent } from "@/lib/analytics";
import type { PublicMomentRecord } from "@/lib/moments/public-moment-types";
import { evaluatePublicMoment } from "@/lib/quality";
import { evaluateSourceAuthorityForPublicMoment } from "@/lib/research/source-authority";
import { buildPublicMomentPath, buildVideoPath, getSiteUrl } from "@/lib/seo";

export function CollectionMomentCard(props: {
  collectionSlug: string;
  moment: PublicMomentRecord;
  queryLabel: string;
}) {
  const { moment: m, collectionSlug, queryLabel } = props;
  const quality = evaluatePublicMoment(m);
  const authority = evaluateSourceAuthorityForPublicMoment(m);
  const href = buildPublicMomentPath(m.id, m.canonicalSlug);
  const canonicalUrl = `${getSiteUrl()}${href}`;

  return (
    <li className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <Link
        href={href}
        className="block"
        onClick={() =>
          void trackPersistentEvent("collection_moment_click", {
            topic: collectionSlug,
            momentId: m.id,
            videoId: m.videoId,
            sourceAuthorityLabel: authority.sourceAuthorityLabel,
            qualityTier: quality.qualityTier,
            surface: "collection",
          })
        }
      >
        <p className="text-sm font-semibold text-white line-clamp-2">&quot;{m.phrase}&quot;</p>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2">{m.videoTitle}</p>
        <p className="mt-2 text-xs text-emerald-200">{m.timestamp}</p>
      </Link>
      <p className="mt-3 text-sm leading-relaxed text-slate-300 line-clamp-4">{m.snippet}</p>
      <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
        <MomentQualitySignals
          evaluation={quality}
          momentId={m.id}
          videoId={m.videoId}
          phrase={m.phrase}
          surface="collection"
          compact
        />
        <SourceAuthorityBadge
          authority={authority}
          momentId={m.id}
          videoId={m.videoId}
          phrase={m.phrase}
          query={queryLabel}
          surface="collection"
          compact
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Link href={buildVideoPath(m.videoId)} className="text-blue-200 hover:text-blue-100">
          Video page
        </Link>
        <Link href={`${href}#cite-this-moment`} className="text-blue-200 hover:text-blue-100">
          Citation
        </Link>
      </div>
      <div className="mt-3">
        <SaveMomentButton
          query={queryLabel}
          videoId={m.videoId}
          title={m.videoTitle ?? m.videoId}
          channel={m.channelName}
          timestamp={m.timestamp}
          snippet={m.snippet}
          youtubeUrl={m.youtubeUrl}
          momentPageUrl={canonicalUrl}
          variant="compact"
        />
      </div>
    </li>
  );
}
