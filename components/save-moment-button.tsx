"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { trackEvent, trackPersistentEvent } from "@/lib/analytics";
import { getSavedClips, isClipSaved, saveClip, type SaveClipInput } from "@/lib/growth/saved-clips";
import { getSiteUrl } from "@/lib/seo";

type SaveMomentButtonProps = SaveClipInput & {
  variant?: "compact" | "default";
};

export function SaveMomentButton(props: SaveMomentButtonProps) {
  const { variant = "default", ...clip } = props;
  const [saved, setSaved] = useState(() => isClipSaved(clip.videoId, clip.youtubeUrl));
  const [showFirstSaveBanner, setShowFirstSaveBanner] = useState(false);

  const momentPageAbsolute = useMemo(() => {
    if (clip.momentPageUrl.startsWith("http")) return clip.momentPageUrl;
    return `${getSiteUrl()}${clip.momentPageUrl}`;
  }, [clip.momentPageUrl]);

  function handleSave() {
    const hadAnySaved = getSavedClips().length > 0;
    const created = saveClip({ ...clip, momentPageUrl: momentPageAbsolute });
    if (created) {
      setSaved(true);
      trackEvent("saved_clip", {
        videoId: clip.videoId,
        queryLength: clip.query.length,
      });
      trackPersistentEvent("saved_clip", {
        query: clip.query,
        videoId: clip.videoId,
      });
      if (!hadAnySaved) {
        trackEvent("first_clip_saved", {
          videoId: clip.videoId,
          query: clip.query,
        });
        trackPersistentEvent("first_clip_saved", {
          query: clip.query,
          videoId: clip.videoId,
        });
        setShowFirstSaveBanner(true);
      }
    }
  }

  if (saved) {
    return (
      <div className="space-y-2">
        <span
          className={
            variant === "compact"
              ? "text-xs text-emerald-300"
              : "inline-flex h-9 items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 text-sm text-emerald-100"
          }
        >
          Saved
        </span>
        {showFirstSaveBanner ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-50">
            <p className="font-medium text-white">Saved. Build your own searchable quote library.</p>
            <Link href="/saved" className="mt-1 inline-block font-semibold text-emerald-100 underline-offset-2 hover:text-white">
              Open saved library →
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      className={
        variant === "compact"
          ? "text-xs font-medium text-amber-200 underline-offset-2 hover:text-amber-100"
          : "inline-flex h-9 items-center rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 text-sm text-amber-100 hover:bg-amber-500/20"
      }
    >
      Save moment
    </button>
  );
}
