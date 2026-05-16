"use client";

import Link from "next/link";

import { trackPersistentEvent } from "@/lib/analytics";
import { instrumentResearchQuery, withResearchSession } from "@/lib/research/research-session-client";
import { buildSearchPath } from "@/lib/seo";

type IntentPhrase = { phrase: string; href: string };

type ContinueExploringSectionProps = {
  phrase: string;
  explorePhrases: string[];
  relatedPhrases: string[];
  peopleAlsoSearched: IntentPhrase[];
  intentGroups: Array<{ label: string; phrases: IntentPhrase[] }>;
};

function dedupePhrases(userPhrase: string, lists: string[][]) {
  const self = userPhrase.toLowerCase().trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = p.toLowerCase().trim();
      if (!key || key === self) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export function ContinueExploringSection({
  phrase,
  explorePhrases,
  relatedPhrases,
  peopleAlsoSearched,
  intentGroups,
}: ContinueExploringSectionProps) {
  const chips = dedupePhrases(phrase, [
    explorePhrases,
    relatedPhrases,
    peopleAlsoSearched.map((p) => p.phrase),
    intentGroups.flatMap((g) => g.phrases.map((p) => p.phrase)),
  ]).slice(0, 18);

  if (
    chips.length === 0 &&
    peopleAlsoSearched.length === 0 &&
    intentGroups.every((g) => g.phrases.length === 0)
  ) {
    return null;
  }

  function trackClick(surface: string, target: string, href: string) {
    instrumentResearchQuery(target);
    trackPersistentEvent(
      "continue_exploring_click",
      withResearchSession({
        query: phrase,
        surface,
        target,
        href,
      })
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-white">Continue exploring</h2>
      <p className="mt-1 text-xs text-slate-400">
        Related queries, topics, and nearby phrases — all open as normal search pages.
      </p>

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((p) => (
            <Link
              key={p}
              href={buildSearchPath(p)}
              onClick={() => trackClick("phrase_chip", p, buildSearchPath(p))}
              className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs text-slate-200 hover:bg-white/10"
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}

      {peopleAlsoSearched.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">People also searched</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {peopleAlsoSearched.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                onClick={() => trackClick("people_also", p.phrase, p.href)}
                className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
              >
                {p.phrase}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {intentGroups.map((group) =>
        group.phrases.length > 0 ? (
          <div key={group.label} className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.phrases.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={() => trackClick("intent_group", p.phrase, p.href)}
                  className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
                >
                  {p.phrase}
                </Link>
              ))}
            </div>
          </div>
        ) : null
      )}
    </section>
  );
}
