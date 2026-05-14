"use client";

import { useState } from "react";

type CopyableLinkProps = {
  label: string;
  value: string;
  monospace?: boolean;
};

export function CopyableLink({ label, value, monospace = true }: CopyableLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className={`mt-2 break-all text-sm text-slate-200 ${monospace ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
