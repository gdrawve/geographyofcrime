// The faint street map under the home-page hex graphic, served as its
// own cached SVG file (/graphics/kc-basemap.svg) so its ~300 KB of
// street lines doesn't weigh down the home page HTML.
// Data: src/data/kc-basemap.json (scripts/build_kc_basemap.py).
import kc from '../../data/kc-basemap.json';

export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${kc.width} ${kc.height}">
<path d="${kc.local}" fill="none" stroke="#ddd3bb" stroke-width="0.6"/>
<path d="${kc.water}" fill="#c4d6d9" stroke="none"/>
<path d="${kc.major}" fill="none" stroke="#b9ae95" stroke-width="1.1"/>
<path d="${kc.highways}" fill="none" stroke="#8a8f99" stroke-width="1.8" stroke-linejoin="round"/>
</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
