import Link from "next/link";
import type { ReactNode } from "react";

import { PRODUCT_TAGLINE } from "@/lib/product-copy";
import { buildCategoriesIndexPath, buildLatestPath, buildTranscriptsIndexPath } from "@/lib/seo";

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
      <p className="mb-2 max-w-2xl text-slate-500">{PRODUCT_TAGLINE}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
        <span>We do not store searches.</span>
        <span>Not affiliated with YouTube.</span>
        <Link href={buildTranscriptsIndexPath()} className="hover:text-slate-200">
          Video index
        </Link>
        <Link href={buildLatestPath()} className="hover:text-slate-200">
          Latest videos
        </Link>
        <Link href={buildCategoriesIndexPath()} className="hover:text-slate-200">
          Categories
        </Link>
        <Link href="/find-youtube-timestamps" className="hover:text-slate-200">
          Find moments
        </Link>
      </div>
    </footer>
  );
}
