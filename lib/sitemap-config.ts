/** Sitemap feature flags for moment URL experiment. */

export const SITEMAP_INCLUDE_MOMENTS =
  process.env.SITEMAP_INCLUDE_MOMENTS === "true" ||
  process.env.NEXT_PUBLIC_SITEMAP_INCLUDE_MOMENTS === "true";

export const SITEMAP_MOMENT_URL_CAP = Number(process.env.SITEMAP_MOMENT_URL_CAP ?? 1000);

export const SITEMAP_MOMENTS_PER_VIDEO = Number(process.env.SITEMAP_MOMENTS_PER_VIDEO ?? 3);
