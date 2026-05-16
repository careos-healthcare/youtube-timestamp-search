#!/usr/bin/env tsx
/** Wrapper — RAG topic-deepening ingest (delegates to generic runner). */

process.env.CORPUS_SCORING_SKIP_ANALYTICS = "1";

import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const forwarded = args.some((a) => a.startsWith("--topic")) ? args : ["--topic=rag", ...args];

execSync(`npm run ingest:topic-deepening -- ${forwarded.map((a) => JSON.stringify(a)).join(" ")}`, {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});
