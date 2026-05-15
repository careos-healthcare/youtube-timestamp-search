"use client";

import { useMemo, useState } from "react";

import { trackEvent, trackPersistentEvent } from "@/lib/analytics";
import { isClipSaved, saveClip, type SaveClipInput } from "@/lib/growth/saved-clips";
import { getSiteUrl } from "@/lib/seo";

type SaveMomentButtonProps = SaveClipInput & {
  variant?: "compact" | "default";
};

export function SaveMomentButton(props: SaveMomentButtonProps) {
  const { variant = "default", ...clip } = props;
  const [saved, setSaved] = useState(() => isClipSaved(clip.videoId, clip.youtubeUrl));

  const momentPageAbsolute = useMemo(() => {
    if (clip.momentPageUrl.startsWith("http")) return clip.momentPageUrl;
    return `${getSiteUrl()}${clip.momentPageUrl}`;
  }, [clip.momentPageUrl]);

  function handleSave() {
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
    }
  }

  if (saved) {
    return (
      <span
        className={
          variant === "compact"
            ? "text-xs text-emerald-300"
            : "inline-flex h-9 items-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 text-sm text-emerald-100"
        }
      >
        Saved
      </span>
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
