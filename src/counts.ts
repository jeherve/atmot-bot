import { SOLVER_SAMPLE_CAP, type Lang, type ResultRecord, type YesterdayCounts } from './config.js';
import { dailyPlayerCount, dailyResultBacklinks, backlinkUri } from './constellation.js';
import { getRecordByUri } from './identity.js';

/**
 * Yesterday's { players, solvers, sampled } for one language. `players` is the
 * cheap distinct-DID count; `solvers` is counted from the sampled records
 * (≤ SOLVER_SAMPLE_CAP) to stay under the free-plan subrequest budget.
 */
export async function yesterdayCounts(lang: Lang, yesterdayN: number): Promise<YesterdayCounts> {
  const [players, backlinks] = await Promise.all([
    dailyPlayerCount(lang, yesterdayN),
    dailyResultBacklinks(lang, yesterdayN, SOLVER_SAMPLE_CAP),
  ]);

  let solvers = 0;
  await Promise.all(
    backlinks.map(async (bl) => {
      const rec = await getRecordByUri<ResultRecord>(backlinkUri(bl));
      if (rec && rec.lang === lang && rec.puzzleNumber === yesterdayN && rec.solved) solvers++;
    }),
  );

  return { players, solvers, sampled: backlinks.length >= SOLVER_SAMPLE_CAP };
}
