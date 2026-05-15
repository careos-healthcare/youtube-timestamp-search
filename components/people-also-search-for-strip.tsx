import Link from "next/link";

import { buildSearchPath } from "@/lib/seo";

type PeopleAlsoSearchForStripProps = {
  phrase: string;
  items: Array<{ phrase: string; href: string; score: number }>;
};

export function PeopleAlsoSearchForStrip({ phrase, items }: PeopleAlsoSearchForStripProps) {
  const self = phrase.toLowerCase().trim();
  const deduped = items.filter((row) => row.phrase.toLowerCase().trim() !== self).slice(0, 12);
  if (deduped.length === 0) return null;

  return (
    <section className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-white">People also search for</h2>
      <p className="mt-1 text-xs text-slate-400">Nearby demand on the same kind of query — opens as a normal search page.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {deduped.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-100 hover:bg-white/10 sm:text-sm"
          >
            {row.phrase}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Looking for a different angle? Try{" "}
        <Link href={buildSearchPath(`${phrase} tutorial`)} className="text-sky-200 hover:text-sky-100">
          {phrase} tutorial
        </Link>{" "}
        or{" "}
        <Link href={buildSearchPath(`${phrase} explained`)} className="text-sky-200 hover:text-sky-100">
          {phrase} explained
        </Link>
        .
      </p>
    </section>
  );
}
