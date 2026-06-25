/** A Bluesky richtext link facet (UTF-8 byte offsets, per the lexicon). */
export interface FacetLink {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: 'app.bsky.richtext.facet#link'; uri: string }>;
}

/** A Bluesky richtext hashtag facet. The byte range covers the leading `#`; `tag` omits it. */
export interface FacetTag {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: 'app.bsky.richtext.facet#tag'; tag: string }>;
}

export type Facet = FacetLink | FacetTag;

const encoder = new TextEncoder();

const byteLen = (s: string): number => encoder.encode(s).length;

/** Facet over the first occurrence of `url` in `text`; [] if it's not there. */
export function linkFacet(text: string, url: string): FacetLink[] {
  const charIndex = text.indexOf(url);
  if (charIndex === -1) return [];
  const byteStart = byteLen(text.slice(0, charIndex));
  const byteEnd = byteStart + byteLen(url);
  return [{ index: { byteStart, byteEnd }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }] }];
}

/**
 * A hashtag at a word boundary: `#` then a letter then word chars. Requiring a
 * leading letter means an all-digit token like the puzzle "#3" is not treated as
 * a tag (matching Bluesky, which rejects all-numeric tags).
 */
const TAG_RE = /(^|\s)(#[A-Za-z][A-Za-z0-9_]*)/g;

/** One `#tag` facet per hashtag in `text` (UTF-8 byte offsets, in text order). */
export function tagFacets(text: string): FacetTag[] {
  const out: FacetTag[] = [];
  for (const m of text.matchAll(TAG_RE)) {
    const lead = m[1] ?? '';
    const hashtag = m[2]!; // e.g. "#WordGame"
    const start = m.index! + lead.length; // char index of the '#'
    const byteStart = byteLen(text.slice(0, start));
    const byteEnd = byteStart + byteLen(hashtag);
    out.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#tag', tag: hashtag.slice(1) }],
    });
  }
  return out;
}
