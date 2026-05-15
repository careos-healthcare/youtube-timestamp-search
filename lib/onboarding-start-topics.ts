import { buildSearchPath } from "@/lib/seo";

/** Curated “Start here” chips on the homepage (indexable search targets). */
export const START_HERE_CHIPS: { label: string; href: string }[] = [
  { label: "AI agents", href: buildSearchPath("ai agents") },
  { label: "System design", href: buildSearchPath("system design") },
  { label: "Startup advice", href: buildSearchPath("startup advice") },
  { label: "React hooks", href: buildSearchPath("react hooks") },
  { label: "Prompt engineering", href: buildSearchPath("prompt engineering") },
  { label: "Productivity", href: buildSearchPath("productivity") },
];
