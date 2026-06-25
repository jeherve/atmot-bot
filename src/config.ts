/**
 * Frozen constants and puzzle math, duplicated from the AT Mot app.
 * Every value here is immutable post-launch (it indexes historical data),
 * so duplicating it into the bot carries no divergence risk.
 */

export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];

export const DOMAIN = 'atmot.herve.bzh';
export const ORIGIN = `https://${DOMAIN}`;

export const NSID_AUTHORITY = 'bzh.herve.atmot';
export const COLLECTION = { result: `${NSID_AUTHORITY}.result` } as const;

/** Epoch: 2026-06-23 (UTC) midnight. Launch day = puzzle #1. (Month is 0-indexed: 5 = June.) */
export const EPOCH_UTC_MS = Date.UTC(2026, 5, 23);

const MS_PER_DAY = 86_400_000;

/** Whole UTC days from the epoch to `at` (epoch day = 0). */
export function daysSinceEpoch(at: number = Date.now()): number {
  const utcMidnight = Math.floor(at / MS_PER_DAY) * MS_PER_DAY;
  return Math.floor((utcMidnight - EPOCH_UTC_MS) / MS_PER_DAY);
}

/** Puzzle number for a UTC day. Epoch = 1; days before the epoch are < 1. */
export function puzzleNumberFor(at: number = Date.now()): number {
  return daysSinceEpoch(at) + 1;
}

/** Canonical, frozen leaderboard target. Constellation compares this literally. */
export function puzzleTarget(lang: Lang, puzzleNumber: number): string {
  return `${ORIGIN}/p/${lang}/${puzzleNumber}`;
}

export const CONSTELLATION_BASE = 'https://constellation.microcosm.blue';
export const APPVIEW_URL = 'https://public.api.bsky.app';
export const USER_AGENT = `atmot-bot/1.0 (+${ORIGIN}; daily word game bot)`;

/** Free Workers plan: keep ~2 subrequests/record under the 50/invocation cap. */
export const SOLVER_SAMPLE_CAP = 20;

/** The result record shape we read from each player's PDS (colours only; subset we use). */
export interface ResultRecord {
  $type: 'bzh.herve.atmot.result';
  lang: string;
  puzzleNumber: number;
  solved: boolean;
  guessCount?: number;
  puzzleTarget: string;
  createdAt: string;
}

/** Yesterday's aggregate, produced by counts.ts and consumed by compose.ts. */
export interface YesterdayCounts {
  /** Distinct players who recorded a result (wins + losses); null if Constellation was unreachable. */
  players: number | null;
  /** Players who solved, counted from the sampled records (≤ SOLVER_SAMPLE_CAP). */
  solvers: number;
  /** True if the sample hit the cap (more results may exist than were counted). */
  sampled: boolean;
}
