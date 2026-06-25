import { describe, it, expect, vi, afterEach } from 'vitest';
import { dailyResultBacklinks, dailyPlayerCount } from '../src/constellation.js';

interface Page {
  records: Array<{ did: string; collection: string; rkey: string }>;
  cursor?: string | null;
}

const rec = (did: string) => ({ did, collection: 'bzh.herve.atmot.result', rkey: 'r' });

/** Stub fetch to serve a sequence of getBacklinks pages keyed by cursor, plus a fixed count. */
function stubFetch(pages: Page[], opts: { total?: number; failOnCursor?: string } = {}) {
  vi.stubGlobal('fetch', async (url: URL) => {
    const u = new URL(url);
    if (u.pathname.includes('distinct-dids')) {
      return new Response(JSON.stringify({ total: opts.total ?? 0 }), { status: 200 });
    }
    const cursor = u.searchParams.get('cursor');
    if (opts.failOnCursor !== undefined && cursor === opts.failOnCursor) {
      return new Response('boom', { status: 500 });
    }
    const idx = cursor ? Number(cursor) : 0;
    const page = pages[idx] ?? { records: [], cursor: null };
    return new Response(JSON.stringify(page), { status: 200 });
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('dailyResultBacklinks pagination', () => {
  it('returns a single complete page as not truncated', async () => {
    stubFetch([{ records: [rec('did:a'), rec('did:b')], cursor: null }]);
    const { records, truncated } = await dailyResultBacklinks('en', 5, 20);
    expect(records.map((r) => r.did)).toEqual(['did:a', 'did:b']);
    expect(truncated).toBe(false);
  });

  it('follows the cursor across pages until it runs out', async () => {
    stubFetch([
      { records: [rec('did:a')], cursor: '1' },
      { records: [rec('did:b')], cursor: null },
    ]);
    const { records, truncated } = await dailyResultBacklinks('en', 5, 20);
    expect(records.map((r) => r.did)).toEqual(['did:a', 'did:b']);
    expect(truncated).toBe(false);
  });

  it('slices to cap and reports truncated when more than cap records exist', async () => {
    stubFetch([{ records: [rec('did:a'), rec('did:b'), rec('did:c')], cursor: null }]);
    const { records, truncated } = await dailyResultBacklinks('en', 5, 2);
    expect(records).toHaveLength(2);
    expect(truncated).toBe(true);
  });

  it('reports truncated when a page fetch fails mid-walk', async () => {
    stubFetch(
      [
        { records: [rec('did:a')], cursor: '1' },
        { records: [rec('did:b')], cursor: '2' },
      ],
      { failOnCursor: '1' },
    );
    const { records, truncated } = await dailyResultBacklinks('en', 5, 20);
    expect(records.map((r) => r.did)).toEqual(['did:a']);
    expect(truncated).toBe(true);
  });
});

describe('dailyPlayerCount', () => {
  it('reads the distinct-DID total', async () => {
    stubFetch([], { total: 42 });
    expect(await dailyPlayerCount('en', 5)).toBe(42);
  });

  it('returns null on a server error', async () => {
    vi.stubGlobal('fetch', async () => new Response('nope', { status: 503 }));
    expect(await dailyPlayerCount('en', 5)).toBeNull();
  });
});
