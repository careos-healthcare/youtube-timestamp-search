import type { AppProps } from "next/app";

/**
 * Minimal Pages Router entry so `next build --webpack` emits `pages-manifest.json`.
 * All user-facing routes live under `app/`.
 */
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
