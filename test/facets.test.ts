import { describe, it, expect } from 'vitest';
import { linkFacet } from '../src/facets.js';

const URL = 'https://atmot.herve.bzh'; // 23 bytes (ASCII)

describe('linkFacet', () => {
  it('computes ASCII byte offsets', () => {
    const text = `Play: ${URL}`;
    expect(linkFacet(text, URL)).toEqual([
      {
        index: { byteStart: 6, byteEnd: 29 },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: URL }],
      },
    ]);
  });

  it('counts multi-byte characters before the url (🟩 is 4 bytes)', () => {
    const text = `🟩 ${URL}`;
    expect(linkFacet(text, URL)).toEqual([
      {
        index: { byteStart: 5, byteEnd: 28 },
        features: [{ $type: 'app.bsky.richtext.facet#link', uri: URL }],
      },
    ]);
  });

  it('returns [] when the url is not present', () => {
    expect(linkFacet('no link here', URL)).toEqual([]);
  });
});
