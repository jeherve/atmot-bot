import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the network-facing modules so we can drive yesterdayCounts deterministically.
vi.mock('../src/constellation.js', () => ({
  dailyPlayerCount: vi.fn(),
  dailyResultBacklinks: vi.fn(),
  backlinkUri: (r: { did: string; rkey: string }) => `at://${r.did}/c/${r.rkey}`,
}));
vi.mock('../src/identity.js', () => ({ getRecordByUri: vi.fn() }));

import { yesterdayCounts } from '../src/counts.js';
import { dailyPlayerCount, dailyResultBacklinks } from '../src/constellation.js';
import { getRecordByUri } from '../src/identity.js';

interface Rec {
  did: string;
  rkey: string;
  lang?: string;
  puzzleNumber?: number;
  solved?: boolean;
  /** When set, getRecordByUri resolves to null for this backlink (a dropped read). */
  drop?: boolean;
}

/** Wire the mocks for one scenario. Records default to (lang='en', puzzle=N, solved). */
function setup(opts: { players: number | null; records: Rec[]; truncated?: boolean }, lang = 'en', n = 5) {
  vi.mocked(dailyPlayerCount).mockResolvedValue(opts.players);
  vi.mocked(dailyResultBacklinks).mockResolvedValue({
    records: opts.records.map((r) => ({ did: r.did, collection: 'c', rkey: r.rkey })),
    truncated: opts.truncated ?? false,
  });
  const byUri = new Map<string, unknown>();
  for (const r of opts.records) {
    if (r.drop) continue;
    byUri.set(`at://${r.did}/c/${r.rkey}`, {
      lang: r.lang ?? lang,
      puzzleNumber: r.puzzleNumber ?? n,
      solved: r.solved ?? true,
    });
  }
  vi.mocked(getRecordByUri).mockImplementation(async (uri: string) => (byUri.get(uri) ?? null) as never);
}

beforeEach(() => vi.clearAllMocks());

describe('yesterdayCounts', () => {
  it('dedupes solvers by DID — one player with two winning records counts once', async () => {
    setup({
      players: 3,
      records: [
        { did: 'did:a', rkey: '1' },
        { did: 'did:a', rkey: '2' }, // same player, second record
        { did: 'did:b', rkey: '1' },
      ],
    });
    const { solvers } = await yesterdayCounts('en', 5);
    expect(solvers).toBe(2);
  });

  it('clamps solvers to players when the two endpoints disagree', async () => {
    setup({
      players: 1, // distinct-DID count says 1...
      records: [
        { did: 'did:a', rkey: '1' },
        { did: 'did:b', rkey: '1' }, // ...but the backlinks index returned two DIDs
      ],
    });
    const { players, solvers } = await yesterdayCounts('en', 5);
    expect(players).toBe(1);
    expect(solvers).toBe(1); // never report more solvers than players
  });

  it('ignores records for the wrong lang or puzzle, and losses', async () => {
    setup({
      players: 4,
      records: [
        { did: 'did:a', rkey: '1', solved: true },
        { did: 'did:b', rkey: '1', solved: false }, // a loss
        { did: 'did:c', rkey: '1', lang: 'fr' }, // wrong language
        { did: 'did:d', rkey: '1', puzzleNumber: 99 }, // wrong puzzle
      ],
    });
    const { solvers, sampled } = await yesterdayCounts('en', 5);
    expect(solvers).toBe(1); // only did:a
    // Only did:a and did:b are valid players for this puzzle; 2 < players(4) => hedge.
    expect(sampled).toBe(true);
  });

  it('is not sampled when every player was resolved and the page was complete', async () => {
    setup({
      players: 2,
      records: [
        { did: 'did:a', rkey: '1', solved: true },
        { did: 'did:b', rkey: '1', solved: false },
      ],
    });
    const { players, solvers, sampled } = await yesterdayCounts('en', 5);
    expect(players).toBe(2);
    expect(solvers).toBe(1);
    expect(sampled).toBe(false);
  });

  it('is sampled when the backlink page was truncated', async () => {
    setup({
      players: 10,
      records: [{ did: 'did:a', rkey: '1' }],
      truncated: true,
    });
    const { sampled } = await yesterdayCounts('en', 5);
    expect(sampled).toBe(true);
  });

  it('is sampled when a record read is dropped (fewer resolved than players)', async () => {
    setup({
      players: 2,
      records: [
        { did: 'did:a', rkey: '1', solved: true },
        { did: 'did:b', rkey: '1', drop: true }, // transient read failure
      ],
    });
    const { solvers, sampled } = await yesterdayCounts('en', 5);
    expect(solvers).toBe(1);
    expect(sampled).toBe(true);
  });

  it('propagates a null player count (Constellation unreachable) as sampled', async () => {
    setup({ players: null, records: [{ did: 'did:a', rkey: '1' }] });
    const { players, sampled } = await yesterdayCounts('en', 5);
    expect(players).toBeNull();
    expect(sampled).toBe(true);
  });
});
