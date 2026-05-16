#!/usr/bin/env tsx
/**
 * Validates `data/ingestion-wave-1-candidates.json` for Wave 1 hygiene.
 *
 *   npm run validate:ingestion-wave-1
 */

import { join } from "node:path";

import { validateWave1CandidatesFile, Wave1ValidationError } from "@/lib/ingestion-wave-1-validate";

async function main() {
  try {
    const candidates = await validateWave1CandidatesFile(join(process.cwd(), "data", "ingestion-wave-1-candidates.json"));
    console.log(`OK — ${candidates.length} Wave 1 candidates validated`);
  } catch (e) {
    if (e instanceof Wave1ValidationError) {
      console.error(e.message);
      process.exit(1);
    }
    throw e;
  }
}

void main();
