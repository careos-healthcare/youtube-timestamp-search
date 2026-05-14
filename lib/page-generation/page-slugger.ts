import { slugifyQuery } from "@/lib/seo";
import { normalizeText } from "@/lib/youtube";

export function slugifySearchPhrase(phrase: string) {
  return slugifyQuery(normalizeText(phrase).toLowerCase());
}

export function slugifyTopicPhrase(phrase: string) {
  return normalizeText(phrase)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function phraseFromTopicSlug(slug: string) {
  return slug.replace(/-/g, " ");
}

export function canonicalSearchPath(phrase: string) {
  return `/search/${slugifySearchPhrase(phrase)}`;
}

export function canonicalTopicPath(slug: string) {
  return `/topic/${slugifyTopicPhrase(slug)}`;
}
