"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { getRecentSearches, type RecentSearchItem } from "@/lib/growth/recent-searches";
import { buildSearchPath } from "@/lib/seo";

export function RecentSearchesPanel() {
  const [items, setItems] = useState<RecentSearchItem[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setItems(getRecentSearches());
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-white">Recent searches</h2>
      <p className="mt-1 text-xs text-slate-400">Stored on this device only.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={`${item.phrase}-${item.savedAt}`}
            href={buildSearchPath(item.phrase)}
            onClick={() =>
              trackEvent("recent_search_click", {
                phraseLength: item.phrase.length,
              })
            }
            className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-slate-200 hover:bg-white/10"
          >
            {item.phrase}
          </Link>
        ))}
      </div>
    </section>
  );
}
