"use client";

import Link from "next/link";

import { trackPersistentEvent } from "@/lib/analytics";
import { buildSearchPath } from "@/lib/seo";

type TryAnotherAngleSectionProps = {
  phrase: string;
  explorePhrases: string[];
  relatedPhrases: string[];
};

function dedupePhrases(phrase: string, lists: string[][]) {
  const self = phrase.toLowerCase().trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = p.toLowerCase().trim();
      if (!key || key === self || seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export function TryAnotherAngleSection({ phrase, explorePhrases, relatedPhrases }: TryAnotherAngleSectionProps) {
  const chips = dedupePhrases(phrase, [explorePhrases, relatedPhrases]).slice(0, 10);
  if (chips.length === 0) return null;

  function track(target: string, href: string) {
    trackPersistentEvent("search_recovery_suggestion_click", {
      query: phrase,
      surface: "try_another_angle",
      target,
      href,
    });
  }

  return (
    <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-white">Try another angle</h2>
      <p className="mt-1 text-xs text-amber-50/85">
        Results look thin or fallback-based — broaden the query with a nearby phrase.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((p) => {
          const href = buildSearchPath(p);
          return (
            <Link
              key={p}
              href={href}
              onClick={() => track(p, href)}
              className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-slate-100 hover:bg-white/10 sm:text-sm"
            >
              {p}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
