import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROME, args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type()==='error' && !m.text().includes('TUNNEL')) errs.push(m.text()); });
await p.goto(`http://localhost:${process.env.PORT||4325}/#map`, { waitUntil: 'load' }); await p.waitForTimeout(8000);
const el = await p.$('.cm-map'); await el.screenshot({ path: process.env.OUT });
// Count distinct colors on the map canvas as a crude "did hexagons draw" signal.
const n = await p.evaluate(() => { const c = document.querySelector('.cm-map canvas'); if (!c) return -1; const t = document.createElement('canvas'); t.width = 200; t.height = 120; const g = t.getContext('2d'); g.drawImage(c, 0, 0, 200, 120); const d = g.getImageData(0,0,200,120).data; const s = new Set(); for (let i=0;i<d.length;i+=16) s.add(d[i]+','+d[i+1]+','+d[i+2]); return s.size; });
console.log('colors on canvas:', n, '| title:', await p.textContent('.crime-map [data-title]'));
console.log(errs.slice(0,5).join('\n'));
await b.close();
