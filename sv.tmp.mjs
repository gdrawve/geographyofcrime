import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
const p = await b.newPage({ viewport: { width: 520, height: 650 } });
await p.goto('file://' + process.env.F); await p.screenshot({ path: process.env.O });
await b.close();
