"use client";

import { useState } from "react";

type ShareActionsProps = {
  shareUrl: string;
  label?: string;
};

export function ShareActions({ shareUrl, label = "Share result" }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  async function shareResult() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "YouTube transcript search result",
          text: "Find the exact moment in this YouTube video.",
          url: shareUrl,
        });
        setShared(true);
        window.setTimeout(() => setShared(false), 1400);
        return;
      } catch {
        // fall through to copy
      }
    }

    await copyLink();
    setShared(true);
    window.setTimeout(() => setShared(false), 1400);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 hover:bg-white/10"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={shareResult}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-400/10 px-4 text-sm font-medium text-blue-100 hover:bg-blue-400/20"
      >
        {shared ? "Shared" : label}
      </button>
    </div>
  );
}
