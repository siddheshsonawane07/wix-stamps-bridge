// Captures the app's real dashboard tabs for the demo video, one screenshot per step plus the
// boxes of whatever the cursor points at, into public/demo/shots/. The screens come from
// app/video-harness (the app's own components, with example data in place of Wix).
// Start the harness first:  cd ../app && npx vite --config video-harness/vite.config.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const NAME = 'demo';
const URL = 'http://localhost:5199/';
const out = path.resolve(`public/${NAME}/shots`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const SAMPLE = [
  'Order ID (required),Order Date,Recipient Name,Company,Address 1,Address 2,City,State,Postal Code,Country,Email,Phone,Item SKU,Quantity,Weight (oz),Gift Message,Cost Code',
  '1001,2026-01-01,Jane Doe,,1 Main St,,Springfield,IL,62701,US,jane@example.com,555-0100,ABC-1,1,8,,',
].join('\n');
const HISTORY = [
  'Date Printed,Order ID,Recipient,Carrier,Mail Class,Tracking #,Amount',
  '2026-11-04,10342,A. Thompson,UPS,UPS Ground,1Z999AA10123456784,12.40',
  '2026-11-04,10343,R. Clarke,UPS,UPS Worldwide Saver,1Z999AA10123456791,24.10',
  '2026-11-04,10344,M. Joseph,UPS,UPS Ground,1Z999AA10123456802,11.90',
  '2026-11-04,10339,K. Baptiste,UPS,UPS Ground,1Z999AA10123456700,12.40',
].join('\n');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const shots = {};
const boxOf = async (loc) => { const b = await loc.boundingBox(); if (!b) throw new Error('no box for ' + loc); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
const union = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) });
async function shot(id, targets = {}) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `${id}.png`) });
  const boxes = {};
  for (const [k, v] of Object.entries(targets)) boxes[k] = typeof v.boundingBox === 'function' ? await boxOf(v) : v;
  shots[id] = { file: `${NAME}/shots/${id}.png`, targets: boxes };
  console.log('shot', id);
}
const file = (name, text) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });
const tab = (label) => page.getByText(label, { exact: true }).first();
const scrollTo = async (loc, offset = 120) => { await page.evaluate(([y]) => window.scrollTo(0, y), [(await loc.boundingBox()).y + (await page.evaluate(() => window.scrollY)) - offset]); await page.waitForTimeout(300); };

// Setup, first time
await page.goto(URL + '?view=setup-empty');
await page.getByText('Step 1').first().waitFor();
await shot('01-setup', { setupTab: tab('Setup'), upload: page.getByRole('button', { name: /Upload sample.csv/ }) });
await page.locator('input[type="file"]').first().setInputFiles(file('sample.csv', SAMPLE));
await page.getByText('Fill with').first().waitFor();
const rows = page.locator('table').first().locator('tbody tr');
const badge = (i) => rows.nth(i).locator('td:nth-child(4)');
await shot('02-mapped', {
  table: page.locator('table').first(),
  upload: page.getByRole('button', { name: /Upload a new sample/ }),
  headers: union(await boxOf(rows.nth(0).locator('td:nth-child(1)')), await boxOf(rows.nth(9).locator('td:nth-child(1)'))),
  matched: union(await boxOf(badge(0)), await boxOf(badge(9))),
  fillWith: union(await boxOf(rows.nth(0).locator('td:nth-child(2)')), await boxOf(rows.nth(9).locator('td:nth-child(2)'))),
});
await scrollTo(rows.nth(10), 140);
await shot('03-mapped-end', {
  noMatch: union(await boxOf(rows.nth(15)), await boxOf(rows.nth(16))),
  save: page.getByRole('button', { name: 'Save layout' }),
});

// Setup, filled: history layout and start date
await page.goto(URL + '?view=ready');
await page.getByText('#10342').first().waitFor();
await tab('Setup').click();
await page.getByText('Step 3').first().waitFor();
await scrollTo(page.getByText('Step 2').first(), 60);
await shot('04-history', {
  history: page.locator('table').nth(1),
  date: page.locator('input[value="2026-11-04"]').first(),
  saveSettings: page.getByRole('button', { name: 'Save settings' }),
});

// To ship
await page.evaluate(() => window.scrollTo(0, 0));
await tab('To ship').click();
await page.getByText('#10342').first().waitFor();
await shot('05-to-ship', {
  toShipTab: tab('To ship'),
  table: page.locator('table').first(),
  download: page.getByRole('button', { name: /Download for Stamps.com/ }),
});

// Upload shipments
await tab('Upload shipments').click();
await page.getByText('Choose history export').first().waitFor();
await shot('06-upload', { uploadTab: tab('Upload shipments'), choose: page.getByRole('button', { name: 'Choose history export' }) });
await page.locator('input[type="file"]').first().setInputFiles(file('history.csv', HISTORY));
await page.getByText('Found 4 labels').first().waitFor();
const planRows = page.locator('table').first().locator('tbody tr');
await shot('07-plan', {
  table: page.locator('table').first(),
  status: union(await boxOf(planRows.nth(0).locator('td:nth-child(4)')), await boxOf(planRows.nth(3).locator('td:nth-child(4)'))),
  skipped: planRows.nth(3),
  confirm: page.getByRole('button', { name: /Confirm: mark 3 as shipped/ }),
});
await page.getByRole('button', { name: /Confirm: mark 3 as shipped/ }).click();
await page.getByText('Marked as shipped').first().waitFor();
await shot('08-done', { results: page.locator('table').last() });

fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify(shots, null, 2) + '\n');
await browser.close();
