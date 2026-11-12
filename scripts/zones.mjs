// Screenshot of the per-card zone detection (zones.html) and its numbers, headless.
//   node scripts/zones.mjs   -> shots/zones-sheet.png, shots/zones.json
// Own Vite server on its own port and cache, closed at the end.
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ root, logLevel: "warn", cacheDir: path.join(root, "node_modules/.vite-shots"), server: { port: 5298, strictPort: false, host: "127.0.0.1", hmr: false } });
await server.listen();
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 3350, height: 900 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  await page.goto(`${server.resolvedUrls.local[0]}zones.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await page.screenshot({ path: path.join(root, "shots/zones-sheet.png"), fullPage: true });
  const report = await page.evaluate(() => window.__report);
  // close-ups, two cards per image (or just the cards named on the command line)
  const ids = process.argv[2] ? process.argv[2].split(",").filter((x) => x !== "none") : Object.keys(report);
  await page.setViewportSize({ width: 1310, height: 900 });
  for (let i = 0; i < ids.length; i += 2) {
    await page.goto(`${server.resolvedUrls.local[0]}zones.html?only=${ids.slice(i, i + 2).join(",")}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.screenshot({ path: path.join(root, `shots/zones-${ids.slice(i, i + 2).join("+")}.png`), fullPage: true });
  }
  await writeFile(path.join(root, "shots/zones.json"), JSON.stringify(report, null, 1));
  for (const [id, r] of Object.entries(report)) console.log(id.padEnd(15), "conf", r.confidence, "dmean", r.depthMean, "stamp", r.stamp.map((v) => v.toFixed(3)).join(","), "depth", r.depthOn ? "on " : "off", "bar", r.barY, "head", r.headY, JSON.stringify(r.found));
} finally {
  await browser.close();
  await server.close();
}
