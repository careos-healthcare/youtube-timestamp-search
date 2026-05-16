import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import "./globals.css";

import { ReferrerTracker } from "@/components/referrer-tracker";
import { ResearchSessionBridge } from "@/components/research-session-bridge";
import { getSiteUrl } from "@/lib/seo";
import {
  PRODUCT_META_DESCRIPTION,
  PRODUCT_META_TITLE,
  PRODUCT_NAME,
} from "@/lib/product-copy";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const metadataBase = new URL(getSiteUrl());

export const metadata: Metadata = {
  metadataBase,
  title: PRODUCT_META_TITLE,
  description: PRODUCT_META_DESCRIPTION,
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: PRODUCT_META_TITLE,
    description: PRODUCT_META_DESCRIPTION,
    images: [
      {
        url: "/og-placeholder.svg",
        width: 1200,
        height: 630,
        alt: `${PRODUCT_NAME} — video knowledge search`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PRODUCT_META_TITLE,
    description: PRODUCT_META_DESCRIPTION,
    images: ["/og-placeholder.svg"],
  },
  verification: {
    google: "Y9eWmNIxO4fyfS4htuc5kUIbjbJ1xBqd-5DVcH7-V44",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ReferrerTracker />
        <ResearchSessionBridge />
        <Analytics />
      </body>
    </html>
  );
}
