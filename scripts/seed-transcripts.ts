#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  formatSeedResultLine,
  formatSeedSummary,
  ingestSeedTranscripts,
  parseSeedCliArgs,
  parseSeedCsv,
  type SeedTranscriptInput,
} from "../lib/seed-transcript-ingestion";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));
}

function printUsage() {
  console.log(`Usage:
  npm run seed:transcripts -- <video_id|youtube_url> [...]
  npm run seed:transcripts:csv -- <path/to/file.csv>

Environment:
  SEED_DELAY_MS=1500   Delay between transcript fetches (default: 1500)
  Requires .env.local with Supabase vars for persistent indexing.
`);
}

function parseArgs(argv: string[]) {
  const csvFlagIndex = argv.findIndex((arg) => arg === "--csv" || arg === "-f");
  if (csvFlagIndex !== -1) {
    const csvPath = argv[csvFlagIndex + 1];
    if (!csvPath) {
      throw new Error("Missing CSV file path after --csv");
    }

    const absolutePath = resolve(process.cwd(), csvPath);
    if (!existsSync(absolutePath)) {
      throw new Error(`CSV file not found: ${absolutePath}`);
    }

    const content = readFileSync(absolutePath, "utf8");
    return parseSeedCsv(content);
  }

  const cliInputs = parseSeedCliArgs(argv);
  return cliInputs;
}

async function main() {
  loadLocalEnv();

  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  let inputs: SeedTranscriptInput[];
  try {
    inputs = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  if (inputs.length === 0) {
    console.error("No valid video inputs found.");
    printUsage();
    process.exit(1);
  }

  const delayMs = Number(process.env.SEED_DELAY_MS ?? 1500);
  console.log(`Starting bulk transcript ingestion for ${inputs.length} video(s)...`);
  console.log(`Rate limit delay: ${delayMs}ms between requests\n`);

  const summary = await ingestSeedTranscripts(inputs, {
    delayMs: Number.isFinite(delayMs) ? delayMs : 1500,
    onResult: (result, index, total) => {
      console.log(`${index}/${total} ${formatSeedResultLine(result)}`);
    },
  });

  console.log(`\n${formatSeedSummary(summary)}`);
  process.exit(summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
