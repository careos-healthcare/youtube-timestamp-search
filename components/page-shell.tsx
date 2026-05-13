import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#0b1120_0%,_#020617_45%,_#020617_100%)] px-4 py-6 text-slate-50 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">{children}</div>
    </main>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 pt-2 text-xs text-slate-400 sm:pt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
        <span>We do not store searches.</span>
        <span>Not affiliated with YouTube.</span>
        <Link href="/find-youtube-quotes" className="hover:text-slate-200">
          Find YouTube quotes
        </Link>
        <Link href="/search-podcast-transcripts" className="hover:text-slate-200">
          Search podcast transcripts
        </Link>
        <Link href="/find-youtube-timestamps" className="hover:text-slate-200">
          Find YouTube timestamps
        </Link>
        <Link href="/search-youtube-captions" className="hover:text-slate-200">
          Search YouTube captions
        </Link>
      </div>
    </footer>
  );
}
