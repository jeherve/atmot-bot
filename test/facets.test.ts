import { describe, it, expect } from 'vitest';
import { linkFacet, tagFacets } from '../src/facets.js';

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

describe('tagFacets', () => {
  it('emits a #tag facet per hashtag (range covers the #, tag has no #)', () => {
    expect(tagFacets('#WordGame #atproto')).toEqual([
      {
        index: { byteStart: 0, byteEnd: 9 },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'WordGame' }],
      },
      {
        index: { byteStart: 10, byteEnd: 18 },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'atproto' }],
      },
    ]);
  });

  it('counts multi-byte characters before a hashtag', () => {
    // "🟩 " is 5 bytes, so "#atproto" starts at byte 5.
    expect(tagFacets('🟩 #atproto')).toEqual([
      {
        index: { byteStart: 5, byteEnd: 13 },
        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'atproto' }],
      },
    ]);
  });

  it('does NOT treat an all-digit token like a puzzle number as a tag', () => {
    expect(tagFacets('AT Mot #3 is live')).toEqual([]);
  });

  it('only matches a hashtag at a word boundary, not mid-word', () => {
    expect(tagFacets('foo#bar')).toEqual([]);
  });

  it('returns [] when there are no hashtags', () => {
    expect(tagFacets('no tags here')).toEqual([]);
  });
});
