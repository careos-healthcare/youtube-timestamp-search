"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { trackEvent, trackPersistentEvent } from "@/lib/analytics";
import {
  markDigestDismissedSession,
  markDigestSubmitted,
  shouldShowEmailDigestPrompt,
} from "@/lib/growth/session-metrics";

export function EmailDigestPrompt() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const shownRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (!shouldShowEmailDigestPrompt()) return;
      setVisible(true);
      if (!shownRef.current) {
        shownRef.current = true;
        trackEvent("email_capture_prompt_shown", {});
        trackPersistentEvent("email_capture_prompt_shown", {});
      }
    });
  }, []);

  if (!visible) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, interest: "weekly_digest" }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      markDigestSubmitted();
      setStatus("done");
      trackEvent("email_capture_submit", {});
      trackPersistentEvent("email_capture_submit", { interest: "weekly_digest" });
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        You&apos;re in — we&apos;ll only email when there&apos;s something worth reopening.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Want your best video moments saved?</h2>
          <p className="mt-1 text-sm text-slate-300">Get a weekly digest of standout transcript moments. No spam.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            markDigestDismissedSession();
            setVisible(false);
          }}
          className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200"
        >
          Not now
        </button>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-400/40"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-11 rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
        >
          {status === "loading" ? "Saving…" : "Send digest"}
        </button>
      </form>
      {status === "error" ? <p className="mt-2 text-xs text-rose-300">Could not save — try again.</p> : null}
    </div>
  );
}
