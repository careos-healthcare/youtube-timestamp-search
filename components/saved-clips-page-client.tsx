"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  exportSavedClipsMarkdown,
  exportSavedTimestampLinks,
  getSavedClips,
  removeSavedClip,
  type SavedClip,
} from "@/lib/growth/saved-clips";
import { buildVideoPath } from "@/lib/seo";

function momentHref(clip: SavedClip) {
  try {
    const u = new URL(clip.momentPageUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return clip.momentPageUrl.startsWith("/") ? clip.momentPageUrl : "/";
  }
}

export function SavedClipsPageClient() {
  const [clips, setClips] = useState<SavedClip[]>([]);

  const refresh = useCallback(() => {
    setClips(getSavedClips());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(exportSavedClipsMarkdown(clips));
  }

  async function copyLinks() {
    await navigator.clipboard.writeText(exportSavedTimestampLinks(clips));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-300">
          Saved on this device only. Export as markdown or plain timestamp links.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyMarkdown()}
            disabled={clips.length === 0}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:opacity-40"
          >
            Copy all (markdown)
          </button>
          <button
            type="button"
            onClick={() => void copyLinks()}
            disabled={clips.length === 0}
            className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-100 hover:bg-blue-500/20 disabled:opacity-40"
          >
            Copy timestamp links
          </button>
        </div>
      </div>

      {clips.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No saved moments yet. Open a search result or moment page and tap{" "}
          <span className="font-medium text-white">Save moment</span>.
        </p>
      ) : (
        <ul className="space-y-4">
          {clips.map((clip) => (
            <li
              key={clip.id}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{new Date(clip.createdAt).toLocaleString()}</p>
                <p className="text-sm font-semibold text-white">{clip.title}</p>
                {clip.channel ? <p className="text-xs text-slate-400">{clip.channel}</p> : null}
                <p className="text-xs font-medium text-emerald-200">{clip.timestamp}</p>
                <p className="text-sm leading-7 text-slate-200">{clip.snippet}</p>
                <p className="text-xs text-slate-500">
                  Query: <span className="text-slate-300">&quot;{clip.query}&quot;</span>
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a href={clip.youtubeUrl} className="text-blue-200 hover:text-blue-100" target="_blank" rel="noreferrer">
                    YouTube
                  </a>
                  <Link href={momentHref(clip)} className="text-blue-200 hover:text-blue-100">
                    Moment page
                  </Link>
                  <Link href={buildVideoPath(clip.videoId)} className="text-slate-400 hover:text-slate-200">
                    Transcript
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  removeSavedClip(clip.id);
                  refresh();
                }}
                className="mt-3 text-xs text-rose-300 hover:text-rose-200 sm:mt-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
