/**
 * Constellation (microcosm) backlink-index client. Returns null/[] on any
 * failure so the bot degrades to no-congrats copy rather than crashing.
 */
import { CONSTELLATION_BASE, USER_AGENT, COLLECTION, puzzleTarget, type Lang } from './config.js';

export interface BacklinkRecord {
  did: string;
  collection: string;
  rkey: string;
}

/** Source path Constellation indexes for the result record's leaderboard link. */
const RESULT_TARGET_PATH = 'puzzleTarget';

async function get(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, CONSTELLATION_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': USER_AGENT } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Distinct DIDs linking to `target`. Null on failure. */
async function countDistinctDids(target: string, collection: string, dottedPath: string): Promise<number | null> {
  const data = (await get('/links/count/distinct-dids', {
    target,
    collection,
    path: dottedPath.startsWith('.') ? dottedPath : `.${dottedPath}`,
  })) as { total?: unknown } | null;
  return typeof data?.total === 'number' ? data.total : null;
}

async function getBacklinksPage(
  target: string,
  collection: string,
  path: string,
  opts: { limit: number; cursor?: string },
): Promise<{ records: BacklinkRecord[]; cursor: string | null } | null> {
  const params: Record<string, string> = {
    subject: target,
    source: `${collection}:${path}`,
    limit: String(opts.limit),
  };
  if (opts.cursor) params.cursor = opts.cursor;
  const data = (await get('/xrpc/blue.microcosm.links.getBacklinks', params)) as
    | { records?: unknown; cursor?: unknown }
    | null;
  if (!data || !Array.isArray(data.records)) return null;
  const cursor = typeof data.cursor === 'string' ? data.cursor : null;
  return { records: data.records as BacklinkRecord[], cursor };
}

/**
 * Up to `cap` backlink records. `truncated` is true when the sample is known to
 * be incomplete — more than `cap` records exist, a page fetch failed mid-walk,
 * or pages remained when the page budget ran out — so callers can hedge.
 */
async function collectBacklinks(
  target: string,
  collection: string,
  path: string,
  cap: number,
): Promise<{ records: BacklinkRecord[]; truncated: boolean }> {
  const out: BacklinkRecord[] = [];
  let cursor: string | undefined;
  let incomplete = false;
  for (let i = 0; i < 10; i++) {
    if (out.length > cap) break; // already have more than we need; the rest is truncated
    // Fetch one extra so we can distinguish "exactly cap" from "more than cap".
    const page = await getBacklinksPage(target, collection, path, { limit: Math.min(100, cap + 1), cursor });
    if (!page) {
      incomplete = true; // a page fetch failed; we can't be sure we have everything
      break;
    }
    out.push(...page.records);
    if (!page.cursor) {
      cursor = undefined;
      break;
    }
    cursor = page.cursor;
  }
  const truncated = incomplete || out.length > cap || cursor !== undefined;
  return { records: out.slice(0, cap), truncated };
}

/** Distinct players who recorded a result for this puzzle (wins + losses). Null on failure. */
export function dailyPlayerCount(lang: Lang, puzzleNumber: number): Promise<number | null> {
  return countDistinctDids(puzzleTarget(lang, puzzleNumber), COLLECTION.result, RESULT_TARGET_PATH);
}

/** Up to `cap` result-record backlinks for this puzzle, plus a `truncated` flag. */
export function dailyResultBacklinks(
  lang: Lang,
  puzzleNumber: number,
  cap: number,
): Promise<{ records: BacklinkRecord[]; truncated: boolean }> {
  return collectBacklinks(puzzleTarget(lang, puzzleNumber), COLLECTION.result, RESULT_TARGET_PATH, cap);
}

export function backlinkUri(r: BacklinkRecord): string {
  return `at://${r.did}/${r.collection}/${r.rkey}`;
}
