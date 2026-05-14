import type { ReactNode } from "react";

import { PRODUCT_NAME } from "@/lib/product-copy";

type OgCardShellProps = {
  badge: string;
  headline: string;
  subheadline?: string;
  quote?: string;
  meta?: string;
  footer?: string;
  accent?: "blue" | "emerald" | "violet";
  children?: ReactNode;
};

const ACCENTS = {
  blue: "linear-gradient(135deg, #0b1120 0%, #1e3a8a 55%, #020617 100%)",
  emerald: "linear-gradient(135deg, #052e16 0%, #065f46 45%, #020617 100%)",
  violet: "linear-gradient(135deg, #1e1b4b 0%, #5b21b6 50%, #020617 100%)",
} as const;

export function OgCardShell({
  badge,
  headline,
  subheadline,
  quote,
  meta,
  footer,
  accent = "blue",
  children,
}: OgCardShellProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "56px",
        background: ACCENTS[accent],
        color: "white",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: 22, opacity: 0.8 }}>{PRODUCT_NAME}</div>
        <div
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            fontSize: 18,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {badge}
        </div>
        <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>{headline}</div>
        {subheadline ? (
          <div style={{ fontSize: 26, opacity: 0.9, maxWidth: 900 }}>{subheadline}</div>
        ) : null}
      </div>

      {quote || meta || children ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 28,
            borderRadius: 24,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            maxWidth: 1000,
          }}
        >
          {quote ? (
            <div style={{ fontSize: 24, lineHeight: 1.45, fontStyle: "italic", opacity: 0.95 }}>
              &quot;{quote}&quot;
            </div>
          ) : null}
          {meta ? <div style={{ fontSize: 20, color: "#86efac" }}>{meta}</div> : null}
          {children}
        </div>
      ) : null}

      {footer ? <div style={{ fontSize: 18, opacity: 0.72 }}>{footer}</div> : null}
    </div>
  );
}
