"use client";

import { useState } from "react";

type SearchResultFeedbackProps = {
  resultCount: number;
};

export function SearchResultFeedback({ resultCount }: SearchResultFeedbackProps) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

  if (resultCount === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
      {answer ? (
        <p className="text-sm text-slate-300">
          {answer === "yes"
            ? "Thanks — glad this found the right moment."
            : "Thanks — we'll use this to improve moment search."}
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-200">Did this find the right moment?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAnswer("yes")}
              className="inline-flex h-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setAnswer("no")}
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              No
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
