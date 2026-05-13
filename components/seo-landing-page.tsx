import Link from "next/link";
import type { ReactNode } from "react";

import { SearchForm } from "@/components/search-form";

type SeoLandingPageProps = {
  title: string;
  description: string;
  bullets: string[];
  suggestedSearches: string[];
  children?: ReactNode;
};

export function SeoLandingPage({
  title,
  description,
  bullets,
  suggestedSearches,
  children,
}: SeoLandingPageProps) {
  return (
  <>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex w-fit rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[11px] font-medium tracking-[0.2em] text-blue-100 uppercase">
              YouTube transcript utility
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-lg sm:leading-8">
              {description}
            </p>
          </div>

          <SearchForm />

          <div className="grid gap-2 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 text-sm text-slate-300"
              >
                {bullet}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">Popular searches</h2>
            <div className="flex flex-wrap gap-2">
              {suggestedSearches.map((search) => (
                <Link
                  key={search}
                  href={`/search/${encodeURIComponent(search.toLowerCase().replace(/\s+/g, "-"))}`}
                  className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-sm text-slate-200 hover:bg-white/10"
                >
                  {search}
                </Link>
              ))}
            </div>
          </div>

          {children}
        </div>
      </section>
    </>
  );
}
