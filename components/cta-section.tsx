"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/analytics";

export function CtaSection() {
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaMessage, setCtaMessage] = useState("");
  const [ctaError, setCtaError] = useState("");
  const [isCtaSubmitting, setIsCtaSubmitting] = useState(false);

  async function submitWaitlist() {
    const trimmedEmail = ctaEmail.trim();

    if (!trimmedEmail) {
      setCtaError("Add your email first.");
      setCtaMessage("");
      return;
    }

    setIsCtaSubmitting(true);
    setCtaError("");
    setCtaMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          interest: "waitlist",
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save your email.");
      }

      trackEvent("cta_email_submitted", { interest: "waitlist" });
      setCtaMessage(data.message ?? "You're on the list.");
    } catch (submissionError) {
      setCtaError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not save your email."
      );
    } finally {
      setIsCtaSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-5">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Help grow the public video knowledge index
        </h2>
        <p className="text-sm leading-6 text-slate-300">
          Get notified as we index more long-form lectures, podcasts, and tutorials for in-video
          search.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="email"
          value={ctaEmail}
          onChange={(event) => setCtaEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-blue-400/60 focus:bg-white/8"
          autoComplete="email"
        />

        <button
          type="button"
          disabled={isCtaSubmitting}
          onClick={submitWaitlist}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-500 px-5 text-sm font-medium text-white transition hover:bg-blue-400 disabled:opacity-60"
        >
          Join the index waitlist
        </button>
      </div>

      {ctaMessage && <p className="mt-3 text-sm text-emerald-300">{ctaMessage}</p>}
      {ctaError && <p className="mt-3 text-sm text-red-300">{ctaError}</p>}
    </div>
  );
}
