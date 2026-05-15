import { ImageResponse } from "next/og";

import { PRODUCT_NAME } from "@/lib/product-copy";

const OG_SIZE = { width: 1200, height: 630 } as const;

/** Strip control chars and normalize whitespace for Satori / @vercel/og. */
export function sanitizeOgText(value: string, maxLen: number) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

type MomentOgPayload = {
  badge: string;
  title: string;
  /** e.g. channel + search phrase */
  subtitle?: string;
  quote: string;
  meta: string;
};

function MomentOgLayout({ badge, title, subtitle, quote, meta }: MomentOgPayload) {
  const safeTitle = sanitizeOgText(title, 100);
  const safeSub = subtitle ? sanitizeOgText(subtitle, 110) : "";
  const safeQuote = sanitizeOgText(quote, 280);
  const safeMeta = sanitizeOgText(meta, 90);
  const safeBadge = sanitizeOgText(badge, 40);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 44,
        backgroundColor: "#312e81",
        color: "#f8fafc",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 18, opacity: 0.75, marginBottom: 10 }}>{PRODUCT_NAME}</div>
        <div
          style={{
            fontSize: 16,
            letterSpacing: 2,
            textTransform: "uppercase",
            opacity: 0.85,
            marginBottom: 14,
          }}
        >
          {safeBadge}
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.12, marginBottom: safeSub ? 10 : 0 }}>
          {safeTitle}
        </div>
        {safeSub ? <div style={{ fontSize: 22, opacity: 0.88 }}>{safeSub}</div> : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 22,
          borderRadius: 14,
          backgroundColor: "rgba(15,23,42,0.55)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <div style={{ fontSize: 22, lineHeight: 1.38, marginBottom: 10 }}>{safeQuote}</div>
        <div style={{ fontSize: 18, color: "#bbf7d0" }}>{safeMeta}</div>
      </div>

      <div style={{ fontSize: 15, opacity: 0.65 }}>Opens on YouTube — transcript excerpt only</div>
    </div>
  );
}

function FallbackOgLayout() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: 48,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>{PRODUCT_NAME}</div>
      <div style={{ fontSize: 22, opacity: 0.85 }}>Transcript moment preview</div>
    </div>
  );
}

export function buildMomentOgPngResponse(payload: MomentOgPayload) {
  try {
    return new ImageResponse(<MomentOgLayout {...payload} />, { ...OG_SIZE });
  } catch {
    return new ImageResponse(<FallbackOgLayout />, { ...OG_SIZE });
  }
}
