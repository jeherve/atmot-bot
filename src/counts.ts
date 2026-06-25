import { SOLVER_SAMPLE_CAP, type Lang, type ResultRecord, type YesterdayCounts } from './config.js';
import { dailyPlayerCount, dailyResultBacklinks, backlinkUri } from './constellation.js';
import { getRecordByUri } from './identity.js';

/**
 * Yesterday's { players, solvers, sampled } for one language. `players` is the
 * cheap distinct-DID count; `solvers` is the number of *distinct* DIDs whose
 * sampled record (≤ SOLVER_SAMPLE_CAP) shows a win.
 *
 * Both numbers are deduped by DID so they are commensurable, and `solvers` is
 * clamped to `players` so the published copy can never say more people solved
 * than played. `sampled` is true whenever the sample is incomplete — the page
 * was truncated, or we resolved fewer distinct players than Constellation
 * counted (a dropped read or index skew) — so compose hedges instead of
 * publishing an untrustworthy exact "X solved, Y didn't".
 */
export async function yesterdayCounts(lang: Lang, yesterdayN: number): Promise<YesterdayCounts> {
  const [players, { records, truncated }] = await Promise.all([
    dailyPlayerCount(lang, yesterdayN),
    dailyResultBacklinks(lang, yesterdayN, SOLVER_SAMPLE_CAP),
  ]);

  const seenDids = new Set<string>();
  const solverDids = new Set<string>();
  await Promise.all(
    records.map(async (bl) => {
      const rec = await getRecordByUri<ResultRecord>(backlinkUri(bl));
      if (!rec || rec.lang !== lang || rec.puzzleNumber !== yesterdayN) return;
      seenDids.add(bl.did);
      if (rec.solved) solverDids.add(bl.did);
    }),
  );

  let solvers = solverDids.size;
  if (players != null) solvers = Math.min(solvers, players);

  const sampled = truncated || players == null || (players > 0 && seenDids.size < players);

  return { players, solvers, sampled };
}
