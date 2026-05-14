import Link from "next/link";

import type { InternalLink, InternalVideoLink } from "@/lib/internal-linking";

type InternalLinksPanelProps = {
  relatedPhrases?: InternalLink[];
  relatedTopics?: InternalLink[];
  relatedVideos?: InternalVideoLink[];
};

export function InternalLinksPanel({
  relatedPhrases = [],
  relatedTopics = [],
  relatedVideos = [],
}: InternalLinksPanelProps) {
  if (
    relatedPhrases.length === 0 &&
    relatedTopics.length === 0 &&
    relatedVideos.length === 0
  ) {
    return null;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {relatedPhrases.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related searches</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedPhrases.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-9 items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-3 text-sm text-blue-100 hover:bg-blue-500/20"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {relatedTopics.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related topics</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedTopics.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-9 items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 text-sm text-emerald-100 hover:bg-emerald-500/20"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {relatedVideos.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-white">Related videos</h2>
          <ul className="mt-4 space-y-2">
            {relatedVideos.map((video) => (
              <li key={video.videoId}>
                <Link href={video.href} className="text-sm text-blue-200 hover:text-blue-100">
                  {video.title}
                </Link>
                {video.detail ? (
                  <span className="ml-2 text-xs text-slate-500">{video.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
