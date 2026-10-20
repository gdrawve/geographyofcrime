// ─────────────────────────────────────────────────────────────
// Accessibility check, run automatically before every deploy.
// It opens every page of the built site in a headless browser, in
// both light and dark mode, and runs axe (the industry-standard
// WCAG checker). Serious or critical problems stop the deploy, so
// an inaccessible page never goes live.
//
// Run locally:  npm run build && npm run a11y
// ─────────────────────────────────────────────────────────────
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const DIST = new URL('../dist/', import.meta.url).pathname;
const axeSource = await readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

// 1. Find every page (skip the old-URL redirect stubs).
async function pages(dir, base = '') {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await pages(join(dir, e.name), `${base}/${e.name}`)));
    else if (e.name === 'index.html') out.push(`${base}/`);
  }
  return out;
}
const redirects = ['/podcast-episodes/', '/about-me/', '/excel-videos/', '/esri-videos/', '/google-videos/', '/news-articles/', '/talks-&-presentations/'];
const list = (await pages(DIST)).filter((p) => !redirects.includes(p));

// 2. Serve the built site locally.
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split('?')[0]);
  if (path.endsWith('/')) path += 'index.html';
  // Read first, then send headers, so a missing file is a clean 404.
  let body;
  try { body = await readFile(join(DIST, path)); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(body);
}).listen(4399);

// 3. Check each page in light and dark mode.
// PW_CHROME lets a local machine point at an existing Chrome.
const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
let failures = 0;
for (const scheme of ['light', 'dark']) {
  for (const p of list) {
    const page = await browser.newPage({ colorScheme: scheme });
    // 'load' (not 'networkidle'): YouTube thumbnails can keep the network
    // busy on CI and time the check out even when the page is fine.
    await page.goto(`http://localhost:4399${p}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(300);
    await page.addScriptTag({ content: axeSource });
    const { violations } = await page.evaluate(() =>
      // eslint-disable-next-line no-undef
      axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }),
    );
    for (const v of violations) {
      const blocking = v.impact === 'serious' || v.impact === 'critical';
      if (blocking) failures++;
      console.log(`${blocking ? '✗' : '!'} [${scheme}] ${p}  ${v.id} (${v.impact}): ${v.help}`);
    }
    await page.close();
  }
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} blocking accessibility issue(s).` : `\nAll ${list.length} pages pass in light and dark mode.`);
process.exit(failures ? 1 : 0);
