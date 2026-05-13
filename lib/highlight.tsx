import type { ReactNode } from "react";

import { normalizeText } from "@/lib/youtube";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderHighlightedText(text: string, highlightTerms: string[]): ReactNode {
  const uniqueTerms = Array.from(
    new Set(
      highlightTerms
        .map((term) => normalizeText(term))
        .filter(Boolean)
        .sort((left, right) => right.length - left.length)
    )
  );

  if (uniqueTerms.length === 0) {
    return text;
  }

  const matcher = new RegExp(`(${uniqueTerms.map(escapeRegExp).join("|")})`, "ig");
  return text.split(matcher).map((part, index) => {
    const isMatch = uniqueTerms.some((term) => part.toLowerCase() === term.toLowerCase());
    if (!isMatch) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <mark key={`${part}-${index}`} className="rounded bg-yellow-300/20 px-1 text-yellow-100">
        {part}
      </mark>
    );
  });
}
