"use client";

import { useMemo, useState } from "react";

import { getSearchSuggestions } from "@/lib/search-suggestions";

type SearchSuggestionsProps = {
  value: string;
  onSelect: (phrase: string) => void;
  inputId: string;
};

export function SearchSuggestions({ value, onSelect, inputId }: SearchSuggestionsProps) {
  const [active, setActive] = useState(false);
  const suggestions = useMemo(
    () => (active && value.trim().length > 0 ? getSearchSuggestions(value, 8) : []),
    [active, value]
  );

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ul
      id={`${inputId}-suggestions`}
      role="listbox"
      className="mt-1 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95"
    >
      {suggestions.map((suggestion) => (
        <li key={suggestion}>
          <button
            type="button"
            role="option"
            aria-selected={false}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(suggestion);
              setActive(false);
            }}
            className="flex w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
          >
            {suggestion}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function useSearchSuggestionFocusHandlers(setActive: (value: boolean) => void) {
  return {
    onFocus: () => setActive(true),
    onBlur: () => window.setTimeout(() => setActive(false), 120),
  };
}
