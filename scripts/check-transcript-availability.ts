#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  checkTranscriptAvailabilityBatch,
  deriveAvailabilityOutputPaths,
  formatAvailabilityResultLine,
  formatAvailabilitySummary,
  seedInputToCsvRecord,
  writeAvailabilityCsv,
} from "../lib/transcript-availability-check";
import {
  formatSeedCsvValidationErrors,
  parseSeedCsv,
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
  npm run check:transcripts -- <path/to/input.csv> [--available-out path] [--rejected-out path]

Environment:
  CHECK_DELAY_MS=1500   Delay between transcript checks (default: 1500)

Outputs:
  <input>.available.csv   Rows with fetchable transcripts
  <input>.rejected.csv    Rows that failed with a reason column

This script does not write to Supabase or local transcript cache.
`);
}

function parseArgs(argv: string[]) {
  const csvPath = argv.find((arg) => !arg.startsWith("-") && arg.endsWith(".csv"));
  if (!csvPath) {
    throw new Error("Missing input CSV path");
  }

  const availableOutIndex = argv.findIndex((arg) => arg === "--available-out");
  const rejectedOutIndex = argv.findIndex((arg) => arg === "--rejected-out");

  const availableOut =
    availableOutIndex !== -1 ? argv[availableOutIndex + 1] : undefined;
  const rejectedOut =
    rejectedOutIndex !== -1 ? argv[rejectedOutIndex + 1] : undefined;

  if (availableOutIndex !== -1 && !availableOut) {
    throw new Error("Missing path after --available-out");
  }

  if (rejectedOutIndex !== -1 && !rejectedOut) {
    throw new Error("Missing path after --rejected-out");
  }

  const absolutePath = resolve(process.cwd(), csvPath);
  if (!existsSync(absolutePath)) {
    throw new Error(`CSV file not found: ${absolutePath}`);
  }

  const derived = deriveAvailabilityOutputPaths(absolutePath);

  return {
    inputPath: absolutePath,
    availablePath: availableOut ? resolve(process.cwd(), availableOut) : derived.availablePath,
    rejectedPath: rejectedOut ? resolve(process.cwd(), rejectedOut) : derived.rejectedPath,
  };
}

async function main() {
  loadLocalEnv();

  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  let paths: ReturnType<typeof parseArgs>;
  try {
    paths = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const content = readFileSync(paths.inputPath, "utf8");
  const parsed = parseSeedCsv(content);

  if (parsed.errors.length > 0) {
    console.error("CSV validation failed:\n");
    console.error(formatSeedCsvValidationErrors(parsed.errors));
    process.exit(1);
  }

  if (parsed.rows.length === 0) {
    console.error("No valid video rows found in CSV.");
    process.exit(1);
  }

  const delayMs = Number(process.env.CHECK_DELAY_MS ?? 1500);
  console.log(`Checking transcript availability for ${parsed.rows.length} video(s)...`);
  console.log(`Rate limit delay: ${delayMs}ms between requests`);
  console.log(`Available output: ${paths.availablePath}`);
  console.log(`Rejected output: ${paths.rejectedPath}\n`);

  const summary = await checkTranscriptAvailabilityBatch(parsed.rows, {
    delayMs: Number.isFinite(delayMs) ? delayMs : 1500,
    onResult: (result, index, total) => {
      console.log(`${index}/${total} ${formatAvailabilityResultLine(result)}`);
    },
  });

  const availableRows = summary.results
    .filter((result) => result.available)
    .map((result) => seedInputToCsvRecord(result.input));

  const rejectedRows = summary.results
    .filter((result) => !result.available)
    .map((result) => ({
      ...seedInputToCsvRecord(result.input),
      reason: result.reason ?? "Transcript unavailable for this video.",
    }));

  writeAvailabilityCsv(paths.availablePath, availableRows);
  writeAvailabilityCsv(paths.rejectedPath, rejectedRows, ["reason"]);

  console.log(`\nWrote ${availableRows.length} available row(s) to ${paths.availablePath}`);
  console.log(`Wrote ${rejectedRows.length} rejected row(s) to ${paths.rejectedPath}`);
  console.log(`\n${formatAvailabilitySummary(summary)}`);
  process.exit(summary.unavailable > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
