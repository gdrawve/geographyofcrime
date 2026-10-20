// JSON that is safe to place inside a <script> tag (JSON-LD or a data
// block). Escaping "<" means data containing "</script>" can't close the
// tag early and inject markup. The two Unicode line separators
// (U+2028, U+2029) are escaped too, since some parsers treat them as
// line breaks.
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
export const safeJson = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
