import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import "./globals.css";

import { getSiteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const metadataBase = new URL(getSiteUrl());

export const metadata: Metadata = {
  metadataBase,
  title: "Search YouTube Transcripts Instantly",
  description: "Paste a YouTube video link and find the exact timestamp where something is mentioned.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Search YouTube Transcripts Instantly",
    description: "Paste a YouTube video link and find the exact timestamp where something is mentioned.",
    images: [
      {
        url: "/og-placeholder.svg",
        width: 1200,
        height: 630,
        alt: "YouTube Timestamp Search preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Search YouTube Transcripts Instantly",
    description: "Paste a YouTube video link and find the exact timestamp where something is mentioned.",
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
        <Analytics />
      </body>
    </html>
  );
}
