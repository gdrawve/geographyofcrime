// ─────────────────────────────────────────────────────────────
// Hexagon summary of Kansas City crime for the home-page graphic.
// Runs at build time. Reads the same weekly data the map uses
// (public/data/crime-grid.json: counts on 150 m cells), keeps NIBRS
// Group A offenses (crimes against persons, property, and society),
// and adds the cells up into H3 hexagons (resolution 8, ~0.74 km²).
// ─────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { latLngToCell, cellToBoundary } from 'h3-js';

type Grid = {
  meta: { bbox: [number, number, number, number]; cellMeters: number; bands: string[]; groups: string[]; catGroup: number[]; start: string; end: string };
  cells: number[][];
};

export const H3_RES = 8;

export function kcHexes() {
  const grid: Grid = JSON.parse(readFileSync(join(process.cwd(), 'public/data/crime-grid.json'), 'utf8'));
  const { bbox, cellMeters, bands, groups, catGroup } = grid.meta;
  const A = new Set(['Persons', 'Property', 'Society'].map((g) => groups.indexOf(g)));
  const perCat = bands.length * 2;                       // data slots per category
  const [w, s, , n] = bbox;
  const mPerLon = 111320 * Math.cos((((s + n) / 2) * Math.PI) / 180);

  const counts = new Map<string, number>();
  for (const c of grid.cells) {
    let t = 0;
    for (let j = 2; j < c.length; j += 2) if (A.has(catGroup[Math.floor(c[j] / perCat)])) t += c[j + 1];
    if (!t) continue;
    // Center of the 150 m cell, then the hexagon it falls in.
    const lon = w + ((c[0] + 0.5) * cellMeters) / mPerLon;
    const lat = s + ((c[1] + 0.5) * cellMeters) / 110540;
    const id = latLngToCell(lat, lon, H3_RES);
    counts.set(id, (counts.get(id) ?? 0) + t);
  }

  // Concentration: share of Group A offenses in the busiest 10% of
  // hexagons that had any (citywide, not just the part drawn).
  const sorted = [...counts.values()].sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  const top = Math.max(1, Math.round(sorted.length * 0.1));
  const topShare = total ? sorted.slice(0, top).reduce((a, b) => a + b, 0) / total : 0;

  // Four shades by quantile (the same breaks the live map uses).
  const q = (p: number) => sorted[sorted.length - 1 - Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  const breaks = [q(0.5), q(0.8), q(0.95)];
  const cls = (v: number) => (v > breaks[2] ? 3 : v > breaks[1] ? 2 : v > breaks[0] ? 1 : 0);

  return {
    hexes: [...counts.entries()].map(([id, v]) => ({ id, v, cls: cls(v), ring: cellToBoundary(id, true) as [number, number][] })),
    topShare,
    hexCount: sorted.length,
    total,
    start: grid.meta.start,
    end: grid.meta.end,
  };
}
