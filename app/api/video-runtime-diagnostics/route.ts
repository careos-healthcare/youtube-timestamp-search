import { NextResponse } from "next/server";

import {
  getVideoPageDiagnosticsLatest,
  getVideoPageDiagnosticsRecent,
} from "@/lib/video-page-diagnostics";

export async function GET() {
  const latest = getVideoPageDiagnosticsLatest();

  return NextResponse.json({
    latest,
    recent: getVideoPageDiagnosticsRecent(),
  });
}
