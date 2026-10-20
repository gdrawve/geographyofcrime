// ─────────────────────────────────────────────────────────────
// VIDEO THUMBNAILS, served from this site
// Runs before the build on every deploy. Finds every YouTube ID in
// src/data/ and saves its thumbnail to public/yt/<id>.jpg, so visitors'
// browsers never contact YouTube until they press play. A thumbnail
// that can't be fetched is skipped; that video shows a plain slot.
//
// Usage: node scripts/fetch_thumbs.mjs
// ─────────────────────────────────────────────────────────────
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'yt');
// YouTube IDs as the data files store them: youtube: 'ID'  or  ['ID', 'Title', 'track']
const YT = /youtube:\s*['"]([\w-]{11})['"]|\[\s*['"]([\w-]{11})['"]\s*,/g;

const ids = new Set();
for (const f of await readdir(join(ROOT, 'src', 'data'))) {
  if (!f.endsWith('.ts')) continue;
  for (const m of (await readFile(join(ROOT, 'src', 'data', f), 'utf8')).matchAll(YT)) ids.add(m[1] || m[2]);
}
await mkdir(OUT, { recursive: true });

let got = 0, kept = 0, failed = [];
const queue = [...ids];
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const file = join(OUT, `${id}.jpg`);
    try { await access(file); kept++; continue; } catch {}
    try {
      const r = await fetch(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await writeFile(file, Buffer.from(await r.arrayBuffer()));
      got++;
    } catch (err) { failed.push(`${id} (${err.message})`); }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`Thumbnails: ${got} downloaded, ${kept} already present, ${failed.length} failed`);
if (failed.length) console.log(`::warning::Thumbnails not fetched: ${failed.join(', ')}`);
