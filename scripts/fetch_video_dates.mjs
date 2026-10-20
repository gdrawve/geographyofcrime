// ─────────────────────────────────────────────────────────────
// VIDEO UPLOAD DATES, for search-engine structured data
// Runs in the weekly refresh. For every YouTube ID in src/data/, reads
// the video's real upload date from YouTube and saves it to
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

// Dates come from the YouTube Data API (videos.list → snippet.publishedAt),
// 50 videos per request. It needs a free API key stored as the GitHub
// secret YOUTUBE_API_KEY. Without one, nothing changes and pages simply
// leave out VideoObject markup. (Reading dates from YouTube's own pages
// doesn't work from GitHub's servers: YouTube shows them a bot check.)
const key = process.env.YOUTUBE_API_KEY;
const todo = [...ids].filter((id) => !dates[id]);
let found = 0;
if (!key) {
  console.log(`::notice::Video dates skipped: no YOUTUBE_API_KEY secret (${todo.length} videos without dates)`);
} else {
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${batch.join(',')}&key=${encodeURIComponent(key)}`;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      for (const v of (await r.json()).items ?? []) {
        if (v.snippet?.publishedAt) { dates[v.id] = v.snippet.publishedAt; found++; }
      }
    } catch (err) { console.log(`::warning::YouTube API request failed (${err.message})`); }
  }
  const still = todo.filter((id) => !dates[id]);
  if (still.length) console.log(`::warning::No upload date from YouTube for: ${still.join(', ')}`);
}
// Keep only IDs still on the site, sorted for tidy diffs.
const out = Object.fromEntries([...ids].filter((id) => dates[id]).sort().map((id) => [id, dates[id]]));
await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Video dates: ${Object.keys(out).length} of ${ids.size} known (${found} new)`);
