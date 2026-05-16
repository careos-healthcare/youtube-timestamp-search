import Link from "next/link";

import { buildSearchPath, buildTopicPath } from "@/lib/seo";

export function MomentTrustContextStrip(props: {
  phrase: string;
  videoTitle: string;
  channelName?: string;
  topicSlug?: string;
}) {
  const { phrase, videoTitle, channelName, topicSlug } = props;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
      <h2 className="text-sm font-semibold text-white">Trust context (read before citing)</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-slate-200">Who said it:</span>{" "}
          {channelName ? <>{channelName} · </> : null}
          {videoTitle}
        </li>
        <li>
          <span className="font-medium text-slate-200">What you&apos;re hearing:</span> a transcript excerpt — not an
          independent verification of claims.
        </li>
        <li>
          <span className="font-medium text-slate-200">Other views:</span>{" "}
          <Link href={buildSearchPath(phrase)} className="text-blue-200 hover:text-blue-100">
            Search other indexed videos for &quot;{phrase}&quot;
          </Link>
          {topicSlug ? (
            <>
              {" "}
              ·{" "}
              <Link href={buildTopicPath(topicSlug)} className="text-blue-200 hover:text-blue-100">
                Topic hub
              </Link>
            </>
          ) : null}
          .
        </li>
      </ul>
    </div>
  );
}
