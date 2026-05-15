"use client";

import Link from "next/link";

import { trackEvent } from "@/lib/analytics";
import { START_HERE_CHIPS } from "@/lib/onboarding-start-topics";

export function StartHereSection() {
  return (
    <section className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-100/90">Start here</h2>
          <p className="mt-1 text-xs text-violet-100/75">
            Jump straight into indexed transcript search — no URL required.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
        {START_HERE_CHIPS.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            onClick={() =>
              trackEvent("homepage_topic_chip_click", {
                label: chip.label,
                href: chip.href,
              })
            }
            className="inline-flex min-h-11 items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-black/20 transition hover:border-violet-300/40 hover:bg-white/15 sm:min-h-12 sm:px-5 sm:text-base"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
