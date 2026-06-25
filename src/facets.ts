/** A Bluesky richtext link facet (UTF-8 byte offsets, per the lexicon). */
export interface FacetLink {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: 'app.bsky.richtext.facet#link'; uri: string }>;
}

const encoder = new TextEncoder();

/** Facet over the first occurrence of `url` in `text`; [] if it's not there. */
export function linkFacet(text: string, url: string): FacetLink[] {
  const charIndex = text.indexOf(url);
  if (charIndex === -1) return [];
  const byteStart = encoder.encode(text.slice(0, charIndex)).length;
  const byteEnd = byteStart + encoder.encode(url).length;
  return [{ index: { byteStart, byteEnd }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }] }];
}
