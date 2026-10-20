// ─────────────────────────────────────────────────────────────
// The Kansas City crime map (MapLibre + H3). This module is loaded on
// demand by CrimeMap.astro when the map nears the screen, so its
// ~1 MB of map code is never downloaded by visitors who don't scroll
// that far.
// ─────────────────────────────────────────────────────────────
import { Map as MLMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
// MapLibre 6 runs its tile work in a Web Worker. Vite copies the worker
// file into the build and gives back its URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { latLngToCell, cellToBoundary, cellToLatLng } from 'h3-js';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);
const maplibregl = { Map: MLMap, NavigationControl };

export function startMap() {

  type Meta = {
    city: string; extent?: string; source: string; sourceUrl: string; start: string; end: string; updated: string;
    demo: boolean; total: number; cellMeters: number; cols: number; rows: number; bbox: [number, number, number, number];
    categories: string[]; bands: string[];
    // From scripts/nibrs.py: short labels, NIBRS "Crime Against" groups, colors.
    short: string[]; groups: string[]; catGroup: number[]; groupColors: string[]; catColors: string[];
  };
  type BG = { id: string; pop: number | null; rings: number[][][]; counts: number[] };

  const root = document.querySelector<HTMLElement>('.crime-map')!;
  const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  // Read colors from the map section itself, which always uses the light palette.
  const css = (v: string) => getComputedStyle(root).getPropertyValue(v).trim();

  // ── State ───────────────────────────────────────────────────
  let M: Meta, cells: number[][], bgs: BG[] | null = null, places: { name: string; lon: number; lat: number }[] = [];
  let mode: 'hex' | 'heat' | 'points' | 'bg' = 'hex';
  const state = { cats: new Set<number>(), band: -1, days: -1, color: 'type' as 'type' | 'count', measure: 'count' as 'count' | 'rate' };
  const NC = () => M.categories.length, NB = () => M.bands.length;

  // ── Safety for text that comes from outside data ────────────
  // Place names come from OpenStreetMap and labels from the data files.
  // Anything inserted as HTML is escaped first, so a name like
  // "<img onerror=…>" shows as text and can never run as code.
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
  // Only plain web links are allowed in generated links.
  const safeUrl = (u: string) => (/^https:\/\/[^\s"'<>]+$/i.test(u || '') ? u : '#');

  // ── Colors: groups vs. types ────────────────────────────────
  // There are ~30 NIBRS categories but only ~7 colors anyone can tell
  // apart. So when the selection spans several groups, everything is
  // colored by GROUP (Persons, Property, Society…); when it's inside one
  // group, each offense category gets its own color. A "key" is whichever
  // of the two is in use.
  let catTotal: number[] = [];               // incidents per category, whole year
  const groupsOn = () => new Set([...state.cats].map((c) => M.catGroup[c]));
  const multi = () => groupsOn().size > 1;
  const keyOf = (c: number) => (multi() ? M.catGroup[c] : c);
  const keyColor = (k: number) => (multi() ? M.groupColors[k] : M.catColors[k]);
  const keyName = (k: number) => (multi() ? M.groups[k] : M.short[k]);
  function keyCounts(cc: Float32Array) {
    const out = new Map<number, number>();
    state.cats.forEach((c) => { const k = keyOf(c); out.set(k, (out.get(k) ?? 0) + cc[c]); });
    return out;
  }
  const dominantKey = (cc: Float32Array) => { let best = -1, v = -1; keyCounts(cc).forEach((n, k) => { if (n > v) { v = n; best = k; } }); return best; };
  // Per fine (150 m) cell: its center, and its H3 cell at each resolution.
  let cellLL: [number, number][] = [];
  const h3At: Record<number, string[]> = {};
  const RES = [7, 8, 9];
  let res = 8;
  const resFor = (z: number) => (z < 10.4 ? 7 : z < 12.2 ? 8 : 9);
  const hexKm2: Record<number, string> = { 7: '5.2 km²', 8: '0.74 km²', 9: '0.11 km²' };

  // ── Map ─────────────────────────────────────────────────────
  // The map is always light: dark basemaps make crime colors hard to read.
  const styleUrl = () => 'https://tiles.openfreemap.org/styles/positron';

  const map = new maplibregl.Map({
    container: $<HTMLElement>('[data-map]'),
    style: styleUrl(),
    bounds: [[-94.665, 38.955], [-94.47, 39.125]],   // opens on the urban core
    maxBounds: [[-94.95, 38.7], [-94.1, 39.5]],
    minZoom: 9.5, maxZoom: 16,
    attributionControl: { compact: true, customAttribution: 'Crime data: KCPD via KC Open Data' },
    cooperativeGestures: true,                       // page scroll stays page scroll; ctrl/two-finger to zoom
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  // If the street tiles can't load (offline, blocked), fall back to a
  // plain background so the crime layers still draw.
  const blank = () => ({ version: 8, sources: {}, layers: [{ id: 'paper', type: 'background', paint: { 'background-color': css('--paper-2') } }] }) as any;
  let fellBack = false;
  map.on('error', (e) => {
    const msg = String(e?.error?.message || e?.error?.status || '');
    if (!map.isStyleLoaded() && !fellBack) { fellBack = true; map.setStyle(blank()); }
  });

  // ── Load data ───────────────────────────────────────────────
  Promise.all([
    fetch('/data/crime-grid.json').then((r) => r.json()),
    fetch('/data/places.json').then((r) => (r.ok ? r.json() : { places: [] })).catch(() => ({ places: [] })),
  ]).then(([g, p]) => {
    M = g.meta; cells = g.cells; places = p.places || [];
    prepare(); buildControls(); recompute();
    if (map.isStyleLoaded()) addLayers(); else map.once('load', addLayers);
  }).catch(() => ($('[data-title]').textContent = 'Map data is unavailable right now.'));

  function prepare() {
    const [w, s, , n] = M.bbox, cm = M.cellMeters;
    const mPerLon = 111320 * Math.cos((((s + n) / 2) * Math.PI) / 180);
    cellLL = cells.map((c) => [w + ((c[0] + 0.5) * cm) / mPerLon, s + ((c[1] + 0.5) * cm) / 110540]);
    for (const r of RES) h3At[r] = cellLL.map(([lon, lat]) => latLngToCell(lat, lon, r));
    catTotal = new Array(NC()).fill(0);
    for (const c of cells) for (let j = 2; j < c.length; j += 2) catTotal[Math.floor(c[j] / 2 / NB())] += c[j + 1];
    // Start with the three NIBRS Crime Against groups on. Group B
    // (arrest-only offenses) and Unclassified start off; one click adds them.
    const startGroups = new Set(['Persons', 'Property', 'Society'].map((g) => M.groups.indexOf(g)));
    state.cats = new Set(M.categories.map((_, i) => i).filter((i) => startGroups.has(M.catGroup[i]) && catTotal[i] > 0));
  }

  // ── Controls ────────────────────────────────────────────────
  function buildControls() {
    $('[data-title]').innerHTML = `<span class="hot">●</span> ${esc(M.city)} · ${M.total.toLocaleString()} incidents in 12 months`;
    renderChips();
    const band = $<HTMLSelectElement>('[data-band]');
    M.bands.forEach((b, i) => band.add(new Option(b, String(i))));
    band.addEventListener('change', () => { state.band = +band.value; recompute(); });
    $<HTMLSelectElement>('[data-days]').addEventListener('change', (e) => { state.days = +(e.target as HTMLSelectElement).value; recompute(); });
    $<HTMLSelectElement>('[data-color]').addEventListener('change', (e) => { state.color = (e.target as HTMLSelectElement).value as any; recompute(); });
    $<HTMLSelectElement>('[data-measure]').addEventListener('change', (e) => { state.measure = (e.target as HTMLSelectElement).value as any; recompute(); });
    root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode as typeof mode;
      root.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      recompute();
    }));
    map.on('zoomend', () => { const r = resFor(map.getZoom()); if (r !== res) { res = r; if (mode === 'hex') recompute(); } });
    res = resFor(map.getZoom());
  }

  // Two rows of buttons: the groups, then the offense categories inside
  // whichever groups are on. Redrawn after every click, because the
  // swatch colors switch between group and type colors.
  function renderChips() {
    const gBox = $('[data-groups]'), tBox = $('[data-cats]');
    // Rebuilding the buttons would drop keyboard focus, so remember which
    // button had it (by its data-k key) and put focus back afterwards.
    const focusedKey = (document.activeElement as HTMLElement | null)?.dataset?.k;
    gBox.replaceChildren(); tBox.replaceChildren();
    const on = groupsOn();
    M.groups.forEach((gName, g) => {
      const members = M.categories.map((_, i) => i).filter((i) => M.catGroup[i] === g && catTotal[i] > 0);
      if (!members.length) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'grp'; b.dataset.k = `g${g}`;
      b.setAttribute('aria-pressed', String(on.has(g)));
      b.style.setProperty('--c', M.groupColors[g]);
      const n = members.reduce((s, i) => s + catTotal[i], 0);
      b.innerHTML = `<i aria-hidden="true"></i>${esc(gName === 'Persons' || gName === 'Property' || gName === 'Society' ? `Crimes against ${gName.toLowerCase()}` : gName)}<span class="ct">${n.toLocaleString()}</span>`;
      if (gName === 'Group B') b.title = 'NIBRS Group B: arrest-only offenses such as DUI, trespass, disorderly conduct, and "all other offenses"';
      if (gName === 'Unclassified') b.title = 'Reports that are not NIBRS offenses: warrant arrests, traffic crashes, investigations, and justifiable homicide. Unfounded reports are removed entirely';
      b.addEventListener('click', () => {
        if (on.has(g)) {
          const left = [...state.cats].filter((c) => M.catGroup[c] !== g);
          if (!left.length) return;                 // keep at least one thing selected
          state.cats = new Set(left);
        } else members.forEach((i) => state.cats.add(i));
        renderChips(); recompute();
      });
      gBox.append(b);
    });
    // Categories of the groups that are on, largest first.
    M.groups.forEach((_, g) => {
      if (!on.has(g)) return;
      const members = M.categories.map((_, i) => i).filter((i) => M.catGroup[i] === g && catTotal[i] > 0).sort((a, b) => catTotal[b] - catTotal[a]);
      members.forEach((i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.k = `c${i}`;
        b.setAttribute('aria-pressed', String(state.cats.has(i)));
        b.style.setProperty('--c', state.cats.has(i) ? keyColor(keyOf(i)) : M.catColors[i]);
        b.title = M.categories[i];
        b.innerHTML = `<i aria-hidden="true"></i>${esc(M.short[i])}`;
        b.addEventListener('click', () => {
          if (state.cats.has(i) && state.cats.size === 1) return;
          state.cats.has(i) ? state.cats.delete(i) : state.cats.add(i);
          renderChips(); recompute();
        });
        tBox.append(b);
      });
    });
    if (focusedKey) {
      // If the focused category disappeared (its group was switched off),
      // fall back to that group's button.
      const again = root.querySelector<HTMLElement>(`[data-k="${focusedKey}"]`) ?? gBox.querySelector<HTMLElement>('button[aria-pressed]');
      again?.focus();
    }
  }

  // ── Counting ────────────────────────────────────────────────
  // slot = (category × bands + band) × 2 + weekend   (same as the Python)
  const decode = (slot: number) => ({ wk: slot % 2, band: Math.floor(slot / 2) % NB(), cat: Math.floor(slot / 2 / NB()) });
  const okBandDay = (d: { wk: number; band: number }) => (state.band < 0 || d.band === state.band) && (state.days < 0 || d.wk === state.days);

  // Counts per category for one record, honoring time and day filters.
  function catCounts(arr: number[], from: number) {
    const out = new Float32Array(NC());
    for (let j = from; j < arr.length; j += 2) { const d = decode(arr[j]); if (okBandDay(d)) out[d.cat] += arr[j + 1]; }
    return out;
  }
  const selectedTotal = (cc: Float32Array) => { let t = 0; state.cats.forEach((c) => (t += cc[c])); return t; };
  const dominant = (cc: Float32Array) => { let best = -1, v = -1; state.cats.forEach((c) => { if (cc[c] > v) { v = cc[c]; best = c; } }); return best; };

  // Quantile class breaks on non-zero values (an analyst's default).
  function breaks(vals: number[]) {
    const nz = vals.filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) => nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] ?? 0;
    return [q(0.5), q(0.8), q(0.95)];
  }
  const cls = (v: number, b: number[]) => (v > b[2] ? 3 : v > b[1] ? 2 : v > b[0] ? 1 : 0);

  let cellCC: Float32Array[] = [];
  let hexAgg: Map<string, { cc: Float32Array; t: number }> = new Map();

  function aggregateHex(r: number) {
    const agg = new Map<string, { cc: Float32Array; t: number }>();
    cellCC.forEach((cc, i) => {
      const id = h3At[r][i];
      let a = agg.get(id);
      if (!a) { a = { cc: new Float32Array(NC()), t: 0 }; agg.set(id, a); }
      for (let k = 0; k < cc.length; k++) a.cc[k] += cc[k];
    });
    agg.forEach((a) => (a.t = selectedTotal(a.cc)));
    return agg;
  }

  // ── Recompute: filters → layers + takeaways ─────────────────
  async function recompute() {
    if (!M) return;
    $<HTMLElement>('[data-color-wrap]').hidden = mode !== 'hex';
    $<HTMLElement>('[data-measure-wrap]').hidden = mode !== 'bg';
    cellCC = cells.map((c) => catCounts(c, 2));
    hexAgg = aggregateHex(res);
    if (mode === 'bg' && !bgs) {
      bgs = await fetch('/data/crime-bg.json').then((r) => r.json()).then((d) => d.bgs).catch(() => []);
    }
    updateLayers();
    takeaways();
  }

  // ── Layers ──────────────────────────────────────────────────
  const empty = { type: 'FeatureCollection', features: [] } as any;
  let handlersBound = false;
  function addLayers() {
    if (!M || map.getSource('hex')) { updateLayers(); return; }
    // Put crime layers under the street labels so names stay readable.
    const firstLabel = map.getStyle().layers.find((l: any) => l.type === 'symbol')?.id;
    map.addSource('hex', { type: 'geojson', data: empty });
    map.addSource('pts', { type: 'geojson', data: empty });
    map.addSource('bg', { type: 'geojson', data: empty });
    map.addLayer({ id: 'bg-fill', type: 'fill', source: 'bg', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'op'] } }, firstLabel);
    map.addLayer({ id: 'bg-line', type: 'line', source: 'bg', paint: { 'line-color': '#5c6478', 'line-width': 0.3, 'line-opacity': 0.35 } }, firstLabel);
    map.addLayer({ id: 'hex-fill', type: 'fill', source: 'hex', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'op'] } }, firstLabel);
    map.addLayer({ id: 'hex-line', type: 'line', source: 'hex', paint: { 'line-color': ['get', 'color'], 'line-width': 0.4, 'line-opacity': 0.5 } }, firstLabel);
    map.addLayer({
      id: 'heat', type: 'heatmap', source: 'pts', paint: {
        'heatmap-weight': ['get', 'w'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 2],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 13, 22, 15, 40],
        'heatmap-opacity': 0.85,
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)', 0.15, css('--ramp-1'), 0.4, css('--ramp-2'), 0.7, css('--ramp-3'), 1, css('--ramp-4')],
      },
    }, firstLabel);
    map.addLayer({
      id: 'pts', type: 'circle', source: 'pts', paint: {
        'circle-color': ['get', 'color'], 'circle-opacity': 0.75,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['*', 0.9, ['sqrt', ['get', 'n']]], 14, ['*', 2.4, ['sqrt', ['get', 'n']]]],
        'circle-stroke-width': 0.4, 'circle-stroke-color': '#ffffff',
      },
    }, firstLabel);

    // Layer event handlers survive style swaps, so bind them only once.
    if (!handlersBound) {
      handlersBound = true;
      map.on('click', 'hex-fill', (e) => showDetail(e.features?.[0]?.properties?.id));
      map.on('click', 'bg-fill', (e) => showBg(e.features?.[0]?.properties));
      for (const l of ['hex-fill', 'bg-fill']) {
        map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
      }
    }
    updateLayers();
  }
  // Re-add our layers if the base style changes (light/dark switch).
  map.on('style.load', () => { if (M) addLayers(); });

  function updateLayers() {
    if (!map.getSource('hex')) return;
    const vis = (id: string, on: boolean) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('hex-fill', mode === 'hex'); vis('hex-line', mode === 'hex');
    vis('heat', mode === 'heat'); vis('pts', mode === 'points');
    vis('bg-fill', mode === 'bg'); vis('bg-line', mode === 'bg');
    const ramp = [css('--ramp-1'), css('--ramp-2'), css('--ramp-3'), css('--ramp-4')];

    if (mode === 'hex') {
      const b = breaks([...hexAgg.values()].map((a) => a.t));
      const feats: any[] = [];
      hexAgg.forEach((a, id) => {
        if (a.t <= 0) return;
        const c = cls(a.t, b);
        feats.push({
          type: 'Feature', geometry: { type: 'Polygon', coordinates: [cellToBoundary(id, true)] },
          properties: {
            id, n: a.t,
            color: state.color === 'type' ? keyColor(dominantKey(a.cc)) : ramp[c],
            op: state.color === 'type' ? [0.38, 0.58, 0.78, 0.94][c] : [0.45, 0.7, 0.85, 0.95][c],
          },
        });
      });
      (map.getSource('hex') as any).setData({ type: 'FeatureCollection', features: feats });
      $('[data-key]').textContent = state.color === 'type'
        ? `Each hexagon (${hexKm2[res]}) shows its most common ${multi() ? 'NIBRS group' : 'offense category'}. Darker means more incidents.`
        : `Each hexagon (${hexKm2[res]}) shaded by number of incidents. Zoom in for smaller hexagons.`;
    }

    if (mode === 'heat' || mode === 'points') {
      let max = 1; cellCC.forEach((cc) => (max = Math.max(max, selectedTotal(cc))));
      const feats: any[] = [];
      cellCC.forEach((cc, i) => {
        const n = selectedTotal(cc); if (n <= 0) return;
        feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: cellLL[i] }, properties: { n, w: n / max, color: keyColor(dominantKey(cc)) } });
      });
      (map.getSource('pts') as any).setData({ type: 'FeatureCollection', features: feats });
      $('[data-key]').textContent = mode === 'heat'
        ? 'Kernel density of incidents: brighter means more concentrated.'
        : `Dots sit at 150 m grid cells, sized by count and colored by the most common ${multi() ? 'group' : 'category'}. Exact addresses are never shown.`;
    }

    if (mode === 'bg' && bgs) {
      const minPop = 200;
      const vals = bgs.map((g) => {
        const n = selectedTotal(catCounts(g.counts, 0));
        const v = state.measure === 'count' ? n : g.pop && g.pop >= minPop ? (n / g.pop) * 1000 : null;
        return { g, n, v };
      });
      const b = breaks(vals.map((x) => x.v ?? 0));
      const feats = vals.map(({ g, n, v }) => ({
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: g.rings.map((r) => [r]) },
        properties: {
          id: g.id, n, pop: g.pop ?? -1, rate: v ?? -1,
          color: v == null ? css('--rule') : v > 0 ? ramp[cls(v, b)] : css('--paper-2'),
          op: v == null ? 0.55 : v > 0 ? [0.5, 0.7, 0.85, 0.95][cls(v, b)] : 0.3,
        },
      }));
      (map.getSource('bg') as any).setData({ type: 'FeatureCollection', features: feats });
      $('[data-key]').textContent = state.measure === 'count'
        ? 'Census block groups, shaded by number of incidents.'
        : 'Incidents per 1,000 residents. Grey: under 200 residents, too few for a fair rate.';
    }
  }

  // ── Takeaways ───────────────────────────────────────────────
  const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
  const nearest = (lon: number, lat: number) => {
    let best = '', d = Infinity;
    for (const p of places) { const dd = (p.lon - lon) ** 2 * 0.6 + (p.lat - lat) ** 2; if (dd < d) { d = dd; best = p.name; } }
    return d < 0.0004 ? best : '';  // within roughly 2 km
  };
  // Plain-English name for the current selection, e.g. "crimes against persons and property".
  const GROUP_PHRASE: Record<string, string> = { Persons: 'persons', Property: 'property', Society: 'society' };
  const listJoin = (a: string[]) => (a.length < 3 ? a.join(' and ') : `${a.slice(0, -1).join(', ')}, and ${a.at(-1)}`);
  const typeLabel = (cats: Set<number>) => {
    const on = [...groupsOn()];
    const whole = on.every((g) => M.categories.every((_, i) => M.catGroup[i] !== g || catTotal[i] === 0 || cats.has(i)));
    if (whole) {
      const against = on.filter((g) => GROUP_PHRASE[M.groups[g]]).map((g) => GROUP_PHRASE[M.groups[g]]);
      const other = on.filter((g) => !GROUP_PHRASE[M.groups[g]]).map((g) => (M.groups[g] === 'Group B' ? 'Group B offenses' : 'unclassified reports'));
      return listJoin([...(against.length ? [`crimes against ${listJoin(against)}`] : []), ...other]);
    }
    return cats.size <= 3 ? `${listJoin([...cats].map((c) => M.short[c].toLowerCase()))} incidents` : 'incidents in the selected categories';
  };

  function takeaways() {
    // 1. Concentration, always on mid-size hexagons so the number is stable.
    const agg8 = res === 8 ? hexAgg : aggregateHex(8);
    const tots = [...agg8.values()].map((a) => a.t).sort((a, b) => b - a);
    const total = tots.reduce((a, b) => a + b, 0);
    let run = 0, k = 0; while (total && run < total / 2) run += tots[k++];
    const active = agg8.size;  // every hexagon that had any incident this year
    $('[data-share]').textContent = total ? pct(k / active) : '–';
    $('[data-share-text]').innerHTML = total
      ? `of the city's active hexagons hold <strong>half of all ${total.toLocaleString()} ${typeLabel(state.cats)}</strong>. Crime concentrates in a small share of places.`
      : 'No incidents match these filters.';

    // 2. Time of day (ignores the time filter, honors days and types).
    const byBand = new Float32Array(NB());
    for (const c of cells) for (let j = 2; j < c.length; j += 2) {
      const d = decode(c[j]);
      if (state.cats.has(d.cat) && (state.days < 0 || d.wk === state.days)) byBand[d.band] += c[j + 1];
    }
    const bt = byBand.reduce((a, b) => a + b, 0) || 1, maxB = Math.max(...byBand), peak = byBand.indexOf(maxB);
    $('[data-bars]').innerHTML = M.bands.map((b, i) =>
      `<div class="${i === peak ? 'peak' : ''}"><b style="height:${(byBand[i] / maxB) * 68}%"></b><span>${esc(b)}<br>${pct(byBand[i] / bt)}</span></div>`).join('');
    // Per-type peaks, so differences between crime types stand out.
    // (By group when several groups show; otherwise the five largest categories.)
    const keyBand = new Map<number, Float32Array>();
    for (const c of cells) for (let j = 2; j < c.length; j += 2) {
      const d = decode(c[j]);
      if (!state.cats.has(d.cat) || (state.days >= 0 && d.wk !== state.days)) continue;
      const k = keyOf(d.cat);
      if (!keyBand.has(k)) keyBand.set(k, new Float32Array(NB()));
      keyBand.get(k)![d.band] += c[j + 1];
    }
    const peaks = [...keyBand.entries()]
      .sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0)).slice(0, 5)
      .map(([k, v]) => ({ k, band: v.indexOf(Math.max(...v)) }));
    const groups = new Map<number, string[]>();
    peaks.forEach((p) => groups.set(p.band, [...(groups.get(p.band) ?? []), multi() ? `crimes against ${M.groups[p.k].toLowerCase()}`.replace('crimes against group b', 'Group B').replace('crimes against unclassified', 'unclassified') : M.short[p.k].toLowerCase()]));
    $('[data-time-text]').innerHTML = `Busiest overall: <strong>${esc(M.bands[peak].toLowerCase())}</strong>. ` +
      esc([...groups].map(([b, names]) => `${cap(names.join(', '))} ${names.length > 1 ? 'peak' : 'peaks'} ${M.bands[b].toLowerCase()}.`).join(' '));

    // 3. Crime mix (honors time and day filters).
    const all = new Float32Array(NC()); cellCC.forEach((cc) => cc.forEach((v, i) => (all[i] += v)));
    const mixMap = keyCounts(all);
    const mt = [...mixMap.values()].reduce((a, b) => a + b, 0) || 1;
    const order = [...mixMap.keys()].sort((a, b) => mixMap.get(b)! - mixMap.get(a)!);
    $('[data-mix]').innerHTML = order.map((k) => `<span style="--c:${keyColor(k)};width:${(mixMap.get(k)! / mt) * 100}%" title="${esc(keyName(k))} ${pct(mixMap.get(k)! / mt)}"></span>`).join('');
    // Name the top six; fold the rest into "others" so the text stays short.
    const shown = order.slice(0, 6), rest = order.slice(6).reduce((a, k) => a + mixMap.get(k)!, 0);
    $('[data-mix-text]').innerHTML = shown.map((k) => `<span class="mk" style="--c:${keyColor(k)}"></span><strong>${esc(keyName(k))}</strong> ${pct(mixMap.get(k)! / mt)}`).join(' · ')
      + (rest ? ` · ${order.length - 6} others ${pct(rest / mt)}` : '');

    // 4. Top hot spots on mid-size hexagons, named by nearest neighborhood.
    const top = [...agg8.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, 5);
    $('[data-hot-note]').textContent = '(0.74 km² each)';
    $('[data-hot]').innerHTML = '';
    top.forEach(([id, a], i) => {
      const [lat, lon] = cellToLatLng(id);
      const name = nearest(lon, lat) ? `Near ${nearest(lon, lat)}` : `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
      const dom = dominant(a.cc);
      const li = document.createElement('li');
      // Built as elements: the place name comes from OpenStreetMap, so it
      // is set with textContent and never parsed as HTML.
      li.innerHTML = `<button type="button"><span class="rk">${i + 1}</span><span><span class="nm"></span><span class="ty">Top: ${esc(M.short[dom].toLowerCase())} · ${pct(a.cc[dom] / (a.t || 1))}</span></span><span class="n">${Math.round(a.t).toLocaleString()}</span></button>`;
      li.querySelector('.nm')!.textContent = name;
      li.querySelector('button')!.addEventListener('click', () => {
        map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 13.2), essential: true });
        showDetail(id, 8);
      });
      $('[data-hot]').append(li);
    });

    // Source line
    const f = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    $('[data-src-line]').innerHTML = `Source: <a href="${esc(safeUrl(M.sourceUrl))}" target="_blank" rel="noopener">${esc(M.source)}</a>, ${f(M.start)} – ${f(M.end)}. Updated ${f(M.updated)}. Crime types are NIBRS offense categories, grouped by NIBRS Crime Against. Counts aggregated to 150 m cells${mode === 'bg' ? '; Census TIGER/Line block groups and ACS 5-year population' : ''}. Map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors. Police-reported incidents only; not every crime is reported.`;
  }
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // ── Details on click ────────────────────────────────────────
  function showDetail(id?: string, r = res) {
    if (!id) return;
    const a = (r === res ? hexAgg : aggregateHex(r)).get(id); if (!a) return;
    // Time of day for this hexagon
    const v = new Float32Array(NB());
    cells.forEach((c, i) => { if (h3At[r][i] !== id) return; for (let j = 2; j < c.length; j += 2) { const d = decode(c[j]); if (state.cats.has(d.cat) && (state.days < 0 || d.wk === state.days)) v[d.band] += c[j + 1]; } });
    const peak = v.indexOf(Math.max(...v));
    const [lat, lon] = cellToLatLng(id); const near = nearest(lon, lat);
    const rows = [...state.cats].filter((c) => a.cc[c] > 0).sort((x, y) => a.cc[y] - a.cc[x]).slice(0, 8)
      .map((c) => `<li><span><i style="--c:${keyColor(keyOf(c))}"></i>${esc(M.short[c])}</span><span>${Math.round(a.cc[c]).toLocaleString()} · ${pct(a.cc[c] / (a.t || 1))}</span></li>`).join('');
    const el = $<HTMLElement>('[data-detail]');
    el.innerHTML = `<button type="button" class="close" aria-label="Close details">Close</button><p class="label">Selected hexagon${near ? ` · near ${esc(near)}` : ''}</p>
      <p class="tk-text"><strong>${Math.round(a.t).toLocaleString()} incidents</strong>, busiest ${esc(M.bands[peak].toLowerCase())}.</p><ul>${rows}</ul>`;
    el.hidden = false;
    el.querySelector('.close')!.addEventListener('click', () => (el.hidden = true));
  }
  function showBg(p: any) {
    if (!p) return;
    const el = $<HTMLElement>('[data-detail]');
    const pop = p.pop >= 0 ? `${Number(p.pop).toLocaleString()} residents` : 'population unknown';
    const rate = p.pop >= 200 ? `, ${((p.n / p.pop) * 1000).toFixed(1)} per 1,000 residents` : p.pop >= 0 ? ', too few residents for a rate' : '';
    el.innerHTML = `<button type="button" class="close" aria-label="Close details">Close</button><p class="label">Block group ${esc(p.id)}</p>
      <p class="tk-text"><strong>${Number(p.n).toLocaleString()} incidents</strong> · ${pop}${rate}.</p>`;
    el.hidden = false;
    el.querySelector('.close')!.addEventListener('click', () => (el.hidden = true));
  }

}
