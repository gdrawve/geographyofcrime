// ─────────────────────────────────────────────────────────────
// SHARE IMAGES (Open Graph cards)
// Runs after `npm run build`. For every page in dist/, it reads the
// page's <title> and description and draws a 1200 × 630 card, the
// image LinkedIn, Slack, and others show when someone shares a link.
// Cards are written to dist/og/<page>.png; Base.astro points each
// page's og:image there. Nothing to edit when you add a page or an
// episode: the next deploy makes its card automatically.
//
// Usage: node scripts/og.mjs   (needs Playwright's Chromium)
// ─────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const OUT = join(DIST, 'og');
const font = (p) => pathToFileURL(join(ROOT, 'node_modules', p)).href;
const badge = pathToFileURL(join(ROOT, 'public/brand/badge-512.png')).href;

// The same rule Base.astro uses to name a page's card: "/" → home,
// "/podcast/ep-09/" → podcast-ep-09.
export const ogSlug = (path) => path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';

// Section label shown above the title, by the first part of the URL.
const KICKER = {
  home: 'Spatial criminology', podcast: 'Podcast', tutorials: 'Tutorials', tools: 'Tools',
  research: 'Research', talks: 'Talks & writing', 'kansas-city': 'Kansas City, Missouri',
  speaking: 'Speaking kit', about: 'About', privacy: 'Privacy', accessibility: 'Accessibility',
  search: 'Search', 404: 'Not found',
};

// Find every built page.
async function pages(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory() && !['og', 'pagefind', '_astro', 'data', 'brand', 'cv'].includes(e.name)) out.push(...(await pages(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function describe(file, html) {
  let rel = '/' + relative(DIST, file).split(sep).join('/');
  rel = rel.replace(/index\.html$/, '').replace(/\.html$/, '/');
  const slug = ogSlug(rel);
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/ · Geography of Crime$/, '');
  const desc = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const section = slug === 'home' ? 'home' : rel.split('/')[1];
  let kicker = KICKER[section] ?? 'Geography of Crime';
  // The page's own headline reads better than its short <title>
  // ("Tools" → "The Crime Analysis Excel Toolkit"), when it's not too long.
  const h1 = decode(((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  let head = slug === 'home' ? 'Crime has an address.' : h1 && h1.length <= 60 ? h1 : title;
  // Episode pages: "Ep. 09: Dr. Michael Niño" → kicker "Podcast · Ep. 09", title "Dr. Michael Niño".
  const ep = section === 'podcast' && title.match(/^(Ep\. ?[\w.]+): (.+)$/);
  if (ep) { kicker = `Podcast · ${ep[1]}`; head = ep[2]; }
  return { slug, kicker, head, desc };
}

const TEMPLATE = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Archivo; src: url(${font('@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2')}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: Plex; src: url(${font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2')}) format('woff2'); font-weight: 500; }
@font-face { font-family: Public; src: url(${font('@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #f5efe0; color: #1f2d48; font-family: Public; position: relative; overflow: hidden; }
.frame { position: absolute; inset: 28px; border: 2px solid #1f2d48; overflow: hidden; }
.hex { position: absolute; right: -150px; top: -50px; width: 470px; height: 670px; }
.copy { position: absolute; left: 76px; top: 72px; width: 740px; display: flex; flex-direction: column; gap: 22px; }
.kicker { font: 500 22px/1 Plex; letter-spacing: 0.12em; text-transform: uppercase; color: #9a2f18; }
.kicker::before { content: ''; display: inline-block; width: 14px; height: 14px; background: #b4371f; border-radius: 50%; margin-right: 14px; vertical-align: 0; }
h1 { font-family: Archivo; font-stretch: 118%; font-weight: 850; line-height: 1.02; letter-spacing: -0.01em; }
.desc { font-size: 26px; line-height: 1.38; color: #4c566a; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.foot { position: absolute; left: 76px; bottom: 64px; display: flex; align-items: center; gap: 18px; }
.foot img { width: 64px; height: 64px; }
.foot b { font: 500 20px/1.2 Plex; letter-spacing: 0.14em; text-transform: uppercase; display: block; }
.foot span { font-size: 20px; color: #4c566a; }
</style></head><body>
<div class="frame"><svg class="hex" viewBox="0 0 470 670" aria-hidden="true"></svg></div>
<div class="copy"><p class="kicker"></p><h1></h1><p class="desc"></p></div>
<div class="foot"><img src="${badge}" alt=""><div><b>Geography of Crime</b><span>Grant Drawve, PhD · geographyofcrime.com</span></div></div>
<script>
  // A field of hexagons on the right, shaded hot-spot style: a quiet
  // nod to the site's crime map. Same pattern on every card.
  const svg = document.querySelector('.hex'), r = 34, w = Math.sqrt(3) * r, ramp = ['#ebe2cc', '#f3d98b', '#e39a36', '#c9452a', '#6e1d12'];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 14; row++) for (let col = 0; col < 7; col++) {
    const cx = col * w + (row % 2 ? w / 2 : 0) + 20, cy = row * r * 1.5 + 20;
    const d = Math.hypot(cx - 260, cy - 330) / 330;           // hotter toward the middle
    const v = Math.max(0, 1 - d + (rnd() - 0.5) * 0.55);
    const k = v > 0.82 ? 4 : v > 0.62 ? 3 : v > 0.42 ? 2 : v > 0.2 ? 1 : 0;
    const pts = [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (cx + (r - 3) * Math.cos(a)).toFixed(1) + ',' + (cy + (r - 3) * Math.sin(a)).toFixed(1); }).join(' ');
    svg.insertAdjacentHTML('beforeend', '<polygon points="' + pts + '" fill="' + ramp[k] + '" opacity="' + (k ? 0.95 : 0.7) + '"/>');
  }
  window.fill = ({ kicker, head, desc }) => {
    document.querySelector('.kicker').textContent = kicker;
    const h = document.querySelector('h1'); h.textContent = head;
    document.querySelector('.desc').textContent = desc;
    // Shrink long titles until they fit in three lines.
    for (let size = 78; size >= 44; size -= 4) { h.style.fontSize = size + 'px'; if (h.scrollHeight <= size * 1.02 * 3 + 4) break; }
    document.querySelector('.desc').style.webkitLineClamp = h.getBoundingClientRect().height > 170 ? 2 : 3;
  };
</script></body></html>`;

const files = await pages(DIST);
await mkdir(OUT, { recursive: true });
const tpl = join(tmpdir(), `og-template-${process.pid}.html`);
await writeFile(tpl, TEMPLATE);

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(tpl).href);
await page.evaluate(() => document.fonts.ready);

let made = 0;
for (const f of files) {
  const html = await readFile(f, 'utf8');
  if (/http-equiv="refresh"/i.test(html)) continue;   // old-URL redirect pages need no card
  const info = describe(f, html);
  const out = join(OUT, `${info.slug}.png`);
  try {
    await page.evaluate((i) => window.fill(i), info);
    await page.screenshot({ path: out, type: 'png' });
    made++;
  } catch (err) {
    // Never break a deploy over a card: fall back to the site-wide image.
    console.warn(`::warning::Share image failed for ${info.slug}: ${err.message}`);
    await copyFile(join(ROOT, 'public/brand/og.png'), out);
  }
}
await browser.close();
console.log(`Made ${made} share images in dist/og/`);
