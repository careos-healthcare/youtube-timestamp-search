"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/analytics";

type WaitlistInterest = "waitlist" | "chrome_extension" | "api_access" | "save_searches";

export function CtaSection() {
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaMessage, setCtaMessage] = useState("");
  const [ctaError, setCtaError] = useState("");
  const [isCtaSubmitting, setIsCtaSubmitting] = useState(false);

  async function submitWaitlist(interest: WaitlistInterest) {
    const trimmedEmail = ctaEmail.trim();

    if (interest === "save_searches") {
      trackEvent("cta_save_search_clicked");
      setCtaError("");
      setCtaMessage("Save searches are coming soon. Join the waitlist above to get notified.");
      return;
    }

    if (interest === "chrome_extension") {
      trackEvent("cta_chrome_extension_clicked");
    }

    if (interest === "api_access") {
      trackEvent("cta_api_access_clicked");
    }

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
          interest,
        }),
      });

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save your email.");
      }

      trackEvent("cta_email_submitted", { interest });
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
          Want this as a Chrome extension?
        </h2>
        <p className="text-sm leading-6 text-slate-300">
          Get notified when save searches, browser extension, and API access launch.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          type="email"
          value={ctaEmail}
          onChange={(event) => setCtaEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-blue-400/60 focus:bg-white/8"
          autoComplete="email"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={isCtaSubmitting}
            onClick={() => submitWaitlist("waitlist")}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-500 px-4 text-sm font-medium text-white transition hover:bg-blue-400 disabled:opacity-60"
          >
            Join waitlist
          </button>
          <button
            type="button"
            disabled={isCtaSubmitting}
            onClick={() => submitWaitlist("chrome_extension")}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
          >
            Chrome extension waitlist
          </button>
          <button
            type="button"
            disabled={isCtaSubmitting}
            onClick={() => submitWaitlist("api_access")}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 transition hover:bg-white/10 disabled:opacity-60"
          >
            API access waitlist
          </button>
          <button
            type="button"
            onClick={() => submitWaitlist("save_searches")}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Save searches coming soon
          </button>
        </div>

        {ctaMessage && <p className="text-sm text-emerald-300">{ctaMessage}</p>}
        {ctaError && <p className="text-sm text-red-300">{ctaError}</p>}
      </div>
    </div>
  );
}
