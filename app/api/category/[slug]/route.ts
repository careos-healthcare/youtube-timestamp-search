import { NextResponse } from "next/server";

import {
  getTranscriptCategoryBySlug,
  normalizeCategorySlug,
} from "@/lib/category-data";
import { getIndexedVideosByCategory } from "@/lib/indexed-videos";

type CategoryRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: CategoryRouteContext) {
  const { slug: rawSlug } = await context.params;
  const slug = normalizeCategorySlug(rawSlug);
  const category = getTranscriptCategoryBySlug(slug);

  if (!category) {
    return NextResponse.json({ error: "Unknown category." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 12), 1), 24);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  try {
    const page = await getIndexedVideosByCategory(category.slug, limit, offset);
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: "Could not load category videos." }, { status: 500 });
  }
}
