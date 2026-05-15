import {
  hybridSearchTranscripts,
  type HybridSearchTranscriptOptions,
} from "@/lib/search/hybrid-search-engine";
import { getRecoveryQueryAttempts, type RecoveryPath } from "@/lib/search/query-expansion";

type HybridSearchBundle = Awaited<ReturnType<typeof hybridSearchTranscripts>>;

function hasHybridHits(hybrid: HybridSearchBundle): boolean {
  return hybrid.results.length > 0 || hybrid.moments.length > 0;
}

export type HybridSearchRecoveryResult = {
  hybrid: HybridSearchBundle;
  appliedQuery: string;
  recoveryPath: RecoveryPath | null;
  attemptedQueries: string[];
};

export async function hybridSearchWithRecovery(
  userQuery: string,
  limit = 20,
  options?: HybridSearchTranscriptOptions
): Promise<HybridSearchRecoveryResult> {
  const trimmed = userQuery.trim();
  const attempts = getRecoveryQueryAttempts(trimmed);
  const attemptedQueries: string[] = [];

  for (const { query: q, path } of attempts) {
    attemptedQueries.push(q);
    const hybrid = await hybridSearchTranscripts(q, limit, options);
    if (hasHybridHits(hybrid)) {
      return { hybrid, appliedQuery: q, recoveryPath: path, attemptedQueries };
    }
  }

  const hybrid = await hybridSearchTranscripts(trimmed, limit, options);
  return {
    hybrid,
    appliedQuery: trimmed,
    recoveryPath: null,
    attemptedQueries,
  };
}
