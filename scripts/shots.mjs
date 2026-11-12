// Headless screenshots for checking the viewer by eye, without opening any window.
//   node scripts/shots.mjs            all shots
//   node scripts/shots.mjs mythic     only shots whose name contains "mythic" (comma-separate several)
// Starts its own Vite server, drives headless Edge (SwiftShader WebGL), writes PNGs to shots/
// and prints console errors and shader warnings. The server is closed at the end.
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "shots");
const filter = process.argv[2] ?? "";

const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desk: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const tilt = "rx=-9&ry=21";
const SHOTS = [
  // one tilted front per card, both viewports for one card of each rarity
  ...[
    ["kizzura", "common"], ["cutg", "common"], ["lunar-aurora", "common"],
    ["babor", "rare"], ["frozone", "rare"], ["soulzz", "rare"],
    ["prime-baxy", "epic"], ["fealthy", "epic"], ["dr-gybbus", "epic"],
    ["onikiri", "legendary"], ["fynxa", "legendary"], ["darknorth", "legendary"],
    ["ipseity", "mythic"], ["shadow-monarch", "mythic"], ["god", "mythic"],
  ].map(([id, r]) => ({ name: `${r}-${id}-tilt`, vp: "phone", q: `card=${id}&${tilt}&ui=0` })),
  { name: "ui-common-kizzura", vp: "phone", q: `card=kizzura&${tilt}` },
  { name: "ui-legendary-onikiri", vp: "phone", q: `card=onikiri&rx=-6&ry=-18` },
  { name: "ui-mythic-ipseity", vp: "desk", q: `card=ipseity&rx=-8&ry=18` },
  { name: "ui-epic-fealthy", vp: "desk", q: `card=fealthy&rx=6&ry=-24` },
  // other light angles
  { name: "rare-frozone-band", vp: "phone", q: `card=frozone&rx=-5&ry=15&ui=0` },
  { name: "rare-soulzz-band", vp: "phone", q: `card=soulzz&rx=-4&ry=-16&ui=0` },
  { name: "rare-babor-otherside", vp: "phone", q: `card=babor&rx=10&ry=-26&ui=0` },
  { name: "epic-prime-baxy-otherside", vp: "phone", q: `card=prime-baxy&rx=8&ry=-22&ui=0` },
  { name: "legendary-onikiri-straight", vp: "phone", q: `card=onikiri&ui=0` },
  { name: "mythic-god-otherside", vp: "phone", q: `card=god&rx=8&ry=-20&ui=0` },
  // the rare streak travelling across the card as it turns, with a common at the same poses
  ...[-14, 4, 24].flatMap((ry, i) => [
    { name: `sweep${i}-rare-frozone`, vp: "phone", q: `card=frozone&rx=-5&ry=${ry}&ui=0` },
    { name: `sweep${i}-common-kizzura`, vp: "phone", q: `card=kizzura&rx=-5&ry=${ry}&ui=0` },
  ]),
  // parallax on / off at a strong angle
  { name: "parallax-on-fynxa", vp: "phone", q: `card=fynxa&rx=-4&ry=34&parallax=1&ui=0` },
  { name: "parallax-off-fynxa", vp: "phone", q: `card=fynxa&rx=-4&ry=34&ui=0` },
  { name: "parallax-on-fealthy", vp: "phone", q: `card=fealthy&rx=10&ry=-28&parallax=1&ui=0` },
  { name: "parallax-off-fealthy", vp: "phone", q: `card=fealthy&rx=10&ry=-28&ui=0` },
  { name: "parallax-on-ipseity", vp: "phone", q: `card=ipseity&rx=-8&ry=24&parallax=1&ui=0` },
  { name: "parallax-off-ipseity", vp: "phone", q: `card=ipseity&rx=-8&ry=24&ui=0` },
  // every card with art depth on at a strong tilt, against the same pose flat
  ...["kizzura", "cutg", "lunar-aurora", "babor", "frozone", "soulzz", "prime-baxy", "fealthy", "dr-gybbus", "onikiri", "fynxa", "darknorth", "ipseity", "shadow-monarch", "god"].flatMap((id) => [
    { name: `depth-on-${id}`, vp: "phone", q: `card=${id}&rx=-8&ry=32&parallax=1&ui=0` },
    { name: `depth-off-${id}`, vp: "phone", q: `card=${id}&rx=-8&ry=32&ui=0` },
  ]),
  // backs
  { name: "back-dark", vp: "phone", q: `card=onikiri&side=back&back=dark&rx=-8&ry=18` },
  { name: "back-green", vp: "phone", q: `card=onikiri&side=back&back=green&rx=-8&ry=18` },
  { name: "back-dark-desk", vp: "desk", q: `card=onikiri&side=back&back=dark&rx=6&ry=-22&ui=0` },
  { name: "back-green-straight", vp: "phone", q: `card=onikiri&side=back&back=green&ui=0` },
  { name: "back-dark-straight", vp: "phone", q: `card=onikiri&side=back&back=dark&ui=0` },
  // mid-flip and edge
  { name: "midflip-legendary", vp: "phone", q: `card=darknorth&rx=-10&ry=72&ui=0` },
  { name: "midflip-mythic", vp: "desk", q: `card=shadow-monarch&rx=-12&ry=105&ui=0` },
  { name: "edge-mythic", vp: "phone", q: `card=god&rx=-6&ry=86&ui=0` },
].filter((s) => filter.split(",").some((f) => s.name.includes(f)));

// own port and dep cache, so a dev server already running from this folder is left alone
const server = await createServer({ root, logLevel: "warn", cacheDir: path.join(root, "node_modules/.vite-shots"), server: { port: 5299, strictPort: false, host: "127.0.0.1", hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
});

let problems = 0;
try {
  const contexts = {};
  for (const [k, opts] of Object.entries(VIEWPORTS)) contexts[k] = await browser.newContext(opts);
  for (const shot of SHOTS) {
    const page = await contexts[shot.vp].newPage();
    const logs = [];
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" || m.type() === "warning" || /THREE|shader|GL_|WebGL/i.test(t)) logs.push(`${m.type()}: ${t}`);
    });
    page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
    const url = `${base}?${shot.q}&still=1`;
    const t0 = Date.now();
    await page.goto(url);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.waitForTimeout(250);
    const errors = await page.evaluate(() => window.__errors);
    const file = path.join(outDir, `${shot.vp}-${shot.name}.png`);
    await page.screenshot({ path: file });
    const all = [...logs, ...errors.map((e) => `app: ${e}`)];
    problems += all.length;
    console.log(`${path.relative(root, file)}  ${Date.now() - t0}ms${all.length ? "\n  " + all.join("\n  ") : ""}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(problems ? `${problems} console problem(s)` : "no console problems");
