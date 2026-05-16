"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { trackEvent, trackPersistentEvent } from "@/lib/analytics";
import {
  instrumentResearchExport,
  instrumentSavedResearchReturn,
  withResearchSession,
} from "@/lib/research/research-session-client";
import {
  exportSavedTimestampLinks,
  exportSpokenKnowledgeLibraryMarkdown,
  getSavedClips,
  removeSavedClip,
  type SavedClip,
} from "@/lib/growth/saved-clips";
import { buildSearchPath, buildVideoPath } from "@/lib/seo";

function momentHref(clip: SavedClip) {
  try {
    const u = new URL(clip.momentPageUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return clip.momentPageUrl.startsWith("/") ? clip.momentPageUrl : "/";
  }
}

function groupKey(clip: SavedClip) {
  const q = clip.query.trim().toLowerCase();
  return q.length > 72 ? `${q.slice(0, 72)}…` : q;
}

export function SavedClipsPageClient() {
  const [clips, setClips] = useState<SavedClip[]>([]);

  const refresh = useCallback(() => {
    setClips(getSavedClips());
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, SavedClip[]>();
    for (const c of clips) {
      const k = groupKey(c) || "other";
      const list = map.get(k) ?? [];
      list.push(c);
      map.set(k, list);
    }
    return [...map.entries()].sort((a, b) => {
      const aMax = Math.max(...a[1].map((x) => new Date(x.createdAt).getTime()));
      const bMax = Math.max(...b[1].map((x) => new Date(x.createdAt).getTime()));
      return bMax - aMax;
    });
  }, [clips]);

  useEffect(() => {
    const clipCount = getSavedClips().length;
    if (clipCount > 0) {
      instrumentSavedResearchReturn(clipCount);
    }
    trackEvent("saved_page_open", withResearchSession({ clipCount, returnVisit: clipCount > 0 }));
    void trackPersistentEvent(
      "saved_page_open",
      withResearchSession({ clipCount, returnVisit: clipCount > 0 })
    );
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  async function copyMarkdown() {
    const md = exportSpokenKnowledgeLibraryMarkdown(clips);
    await navigator.clipboard.writeText(md);
    instrumentResearchExport({
      surface: "saved_library",
      format: "markdown",
      clipCount: clips.length,
    });
    void trackPersistentEvent(
      "saved_library_export",
      withResearchSession({
        surface: "saved_library",
        format: "markdown",
        clipCount: clips.length,
      })
    );
  }

  async function copyLinks() {
    await navigator.clipboard.writeText(exportSavedTimestampLinks(clips));
    instrumentResearchExport({
      surface: "saved_library",
      format: "timestamp_links",
      clipCount: clips.length,
    });
    void trackPersistentEvent(
      "saved_library_export",
      withResearchSession({
        surface: "saved_library",
        format: "timestamp_links",
        clipCount: clips.length,
      })
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Local research library</p>
        <p className="mt-2">
          Clips stay on this device only. Each entry stores the search you used, the transcript excerpt, and links back
          to the canonical moment page — useful as lightweight citations when you revisit a thread.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>Grouped by the query you searched when saving.</li>
          <li>Export includes markdown with YouTube + moment links (your saved citations).</li>
          <li>Revisit threads: tap a group heading search link to run the query again.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-300">Saved on this device only.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyMarkdown()}
            disabled={clips.length === 0}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:opacity-40"
          >
            Export all (markdown)
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
          Nothing in your library yet. Open a search result or moment page and tap{" "}
          <span className="font-medium text-white">Add to library</span>.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map(([label, rows]) => (
            <section key={label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-sm font-semibold text-white">Thread: “{label}”</h2>
                <Link
                  href={buildSearchPath(rows[0]?.query ?? label)}
                  className="text-xs text-blue-200 hover:text-blue-100"
                >
                  Re-run search →
                </Link>
              </div>
              <ul className="mt-4 space-y-4">
                {rows.map((clip) => (
                  <li
                    key={clip.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">{new Date(clip.createdAt).toLocaleString()}</p>
                      <p className="text-sm font-semibold text-white">{clip.title}</p>
                      {clip.channel ? <p className="text-xs text-slate-400">{clip.channel}</p> : null}
                      <p className="text-xs font-medium text-emerald-200">{clip.timestamp}</p>
                      <p className="text-sm leading-7 text-slate-200">{clip.snippet}</p>
                      <p className="text-xs text-slate-500">
                        Saved citation: moment page + YouTube link in export.
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
