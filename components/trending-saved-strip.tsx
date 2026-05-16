"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getSavedClips, type SavedClip } from "@/lib/growth/saved-clips";

function hrefForMoment(url: string) {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url.startsWith("/") ? url : "/saved";
  }
}

export function TrendingSavedStrip() {
  const [clips, setClips] = useState<SavedClip[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setClips(getSavedClips().slice(0, 6));
    });
  }, []);

  if (clips.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Save clips from search or transcript pages with “Add to library” — they show here on this device.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {clips.map((clip) => (
        <li key={clip.id} className="text-sm">
          <Link href={hrefForMoment(clip.momentPageUrl)} className="text-blue-200 hover:text-blue-100">
            {clip.title}
          </Link>
          <span className="ml-2 text-xs text-slate-500">{clip.timestamp}</span>
        </li>
      ))}
    </ul>
  );
}
