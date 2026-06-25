import { describe, it, expect } from 'vitest';
import { alreadyPosted, type BotSession } from '../src/post.js';
import { postMarker } from '../src/compose.js';

/** A fake session whose listRecords returns `texts` (or fails when `ok` is false). */
function fakeSession(texts: string[], ok = true): BotSession {
  return {
    did: 'did:plc:bot',
    client: {
      get: async () => ({
        ok,
        data: { records: texts.map((text) => ({ value: { text } })) },
      }),
    },
  } as unknown as BotSession;
}

describe('alreadyPosted', () => {
  it('detects today’s marker in a recent post', async () => {
    const marker = postMarker('en', 5); // "AT Mot #5"
    const session = fakeSession([`🟩 ${marker} is live! ...`]);
    expect(await alreadyPosted(session, marker)).toBe(true);
  });

  it('returns false when no recent post carries the marker', async () => {
    const session = fakeSession(['🟩 AT Mot #4 is live! ...', 'unrelated post']);
    expect(await alreadyPosted(session, postMarker('en', 5))).toBe(false);
  });

  it('does not cross-match EN and FR markers for the same puzzle', async () => {
    const enSession = fakeSession([`🟩 ${postMarker('fr', 5)} est en ligne ! ...`]);
    expect(await alreadyPosted(enSession, postMarker('en', 5))).toBe(false);

    const frSession = fakeSession([`🟩 ${postMarker('en', 5)} is live! ...`]);
    expect(await alreadyPosted(frSession, postMarker('fr', 5))).toBe(false);
  });

  it('allows the post (returns false) when the listRecords read fails', async () => {
    const session = fakeSession([`🟩 ${postMarker('en', 5)} is live! ...`], false);
    expect(await alreadyPosted(session, postMarker('en', 5))).toBe(false);
  });
});
