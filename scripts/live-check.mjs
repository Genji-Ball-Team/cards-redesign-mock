// Loads a deployed copy of the mock headlessly, lists failed requests and
// console errors, and saves one screenshot.
import { chromium } from 'playwright-core';

const url = process.argv[2];
const out = process.argv[3];
const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
});
page.on('requestfailed', (r) => problems.push(`failed ${r.url()}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
await page.screenshot({ path: out });
await browser.close();
console.log(problems.length ? problems.join('\n') : 'no failed requests or errors');
