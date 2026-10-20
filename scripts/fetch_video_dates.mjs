// ─────────────────────────────────────────────────────────────
// VIDEO UPLOAD DATES, for search-engine structured data
// Runs in the weekly refresh. For every YouTube ID in src/data/, reads
// the video's real upload date from its YouTube page and saves it to
// src/data/video-dates.json. Pages only describe a video to search
// engines (schema.org VideoObject) when its date is known; dates are
// never guessed. Dates already saved are kept, so each video is looked
// up once.
//
// Usage: node scripts/fetch_video_dates.mjs
// ─────────────────────────────────────────────────────────────
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data', 'video-dates.json');
const YT = /youtube:\s*['"]([\w-]{11})['"]|\[\s*['"]([\w-]{11})['"]\s*,/g;

const ids = new Set();
for (const f of await readdir(join(ROOT, 'src', 'data'))) {
  if (!f.endsWith('.ts')) continue;
  for (const m of (await readFile(join(ROOT, 'src', 'data', f), 'utf8')).matchAll(YT)) ids.add(m[1] || m[2]);
}
let dates = {};
try { dates = JSON.parse(await readFile(OUT, 'utf8')); } catch {}

// The watch page carries the date in its embedded metadata, e.g.
// "uploadDate":"2021-03-04T09:00:00-08:00" or <meta itemprop="uploadDate" content="2021-03-04">.
const PATTERNS = [/"uploadDate":"([^"]+)"/, /itemprop="uploadDate" content="([^"]+)"/, /"publishDate":"([^"]+)"/];
const queue = [...ids].filter((id) => !dates[id]);
let found = 0; const missed = [];
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    try {
      const r = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US' } });
      const html = await r.text();
      const m = PATTERNS.map((p) => html.match(p)).find(Boolean);
      const iso = m && !Number.isNaN(Date.parse(m[1])) ? m[1] : null;
      if (iso) { dates[id] = iso; found++; } else missed.push(id);
    } catch { missed.push(id); }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
// Keep only IDs still on the site, sorted for tidy diffs.
const out = Object.fromEntries([...ids].filter((id) => dates[id]).sort().map((id) => [id, dates[id]]));
await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Video dates: ${Object.keys(out).length} of ${ids.size} known (${found} new)`);
if (missed.length) console.log(`::warning::No upload date found for: ${missed.join(', ')}`);
