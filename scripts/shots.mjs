// Headless screenshots for checking the viewer and the pack screen by eye, without opening any
// window. Pack shots are named pack-*.
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
  calm: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" },
};

const tilt = "rx=-9&ry=21";
const VIEWER = [
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
  { name: "back", vp: "phone", q: `card=onikiri&side=back&rx=-8&ry=18` },
  { name: "back-desk", vp: "desk", q: `card=onikiri&side=back&rx=6&ry=-22&ui=0` },
  { name: "back-straight", vp: "phone", q: `card=onikiri&side=back&ui=0` },
  { name: "back-near-straight", vp: "phone", q: `card=onikiri&side=back&rx=-3&ry=5&ui=0` },
  // mid-flip and edge
  { name: "midflip-legendary", vp: "phone", q: `card=darknorth&rx=-10&ry=72&ui=0` },
  { name: "midflip-mythic", vp: "desk", q: `card=shadow-monarch&rx=-12&ry=105&ui=0` },
  { name: "edge-mythic", vp: "phone", q: `card=god&rx=-6&ry=86&ui=0` },
].map((s) => ({ ...s, q: `screen=cards&${s.q}` }));

// The pack screen. One pull with one card of each rarity (a rigged pull keeps its order: the
// mythic lands in the middle of the spread).
const PULL = "pull=kizzura,frozone,fealthy,onikiri,god";
const OPEN = `screen=open&${PULL}`;
// slot, rarity, flip moments: [label, seconds into the flip]
const FLIP_MOMENTS = [
  [0, "common", [["a-mid", 0.16], ["b-after", 0.36], ["c-settle", 0.5]]],
  [1, "rare", [["a-mid", 0.3], ["b-after", 0.48], ["c-settle", 0.7]]],
  [2, "epic", [["a-charge", 0.2], ["b-mid", 0.47], ["c-after", 0.62], ["d-settle", 0.9]]],
  [3, "legendary", [["a-beat", 0.55], ["b-mid", 0.9], ["c-after", 1.08], ["d-settle", 1.5]]],
  [4, "mythic", [["a-dark", 0.9], ["b-leak", 1.4], ["c-mid", 1.95], ["d-after", 2.42], ["e-stamp", 2.8], ["f-settle", 3.3]]],
];
const PACK = [
  // idle, one per type (t=0.6 catches the light sweep part way)
  ...["daily", "starter", "epic", "legendary", "mythic"].map((t) => ({ name: `pack-idle-${t}`, vp: "phone", q: `pack=${t}&rx=-6&ry=16&t=0.6` })),
  // the back, with the fin seal down the middle
  ...["daily", "mythic"].map((t) => ({ name: `pack-back-${t}`, vp: "phone", q: `pack=${t}&rx=-6&ry=196&t=0.6` })),
  { name: "pack-idle-daily-desk", vp: "desk", q: `pack=daily&rx=-5&ry=-14&t=0.6` },
  { name: "pack-idle-mythic-desk", vp: "desk", q: `pack=mythic&rx=-5&ry=14&t=2` },
  // the opening
  ...[["a-anticipation", 0.45], ["b-tear", 0.6], ["c-burst", 0.72], ["d-arc", 1.0], ["e-arc", 1.3], ["f-landing", 1.62]].flatMap(([n, t]) => [
    { name: `pack-seq-${n}`, vp: "phone", q: `pack=epic&${PULL}&seq=${t}` },
    { name: `pack-seq-${n}-desk`, vp: "desk", q: `pack=epic&${PULL}&seq=${t}` },
  ]),
  { name: "pack-spread", vp: "phone", q: OPEN },
  { name: "pack-spread-desk", vp: "desk", q: OPEN },
  // hover: the same neutral lift for every card (the common in slot 0, the mythic in slot 4)
  ...[0, 4].map((i) => ({ name: `pack-hover-${i}`, vp: "phone", q: `${OPEN}&hover=${i}` })),
  { name: "pack-hover-0-desk", vp: "desk", q: `${OPEN}&hover=0` },
  { name: "pack-hover-4-desk", vp: "desk", q: `${OPEN}&hover=4` },
  // full-frame peaks of the screen-wide effects, and the frame where each has cleared
  ...[
    ["a-common", 0, 0.34, 0.55],
    ["b-rare", 1, 0.5, 0.95],
    ["c-epic", 2, 0.64, 1.3],
    ["d-legendary", 3, 1.1, 1.95],
    ["e-mythic", 4, 2.45, 3.6],
  ].flatMap(([r, slot, peak, clear]) => [
    { name: `pack-peak-${r}`, vp: "phone", q: `${OPEN}&flip=${slot}&ft=${peak}` },
    { name: `pack-peak-${r}-desk`, vp: "desk", q: `${OPEN}&flip=${slot}&ft=${peak}` },
    { name: `pack-clear-${r}`, vp: "phone", q: `${OPEN}&flip=${slot}&ft=${clear}` },
  ]),
  { name: "pack-peak-d-legendary-beat", vp: "phone", q: `${OPEN}&flip=3&ft=0.85` },
  { name: "pack-peak-e-mythic-dark", vp: "phone", q: `${OPEN}&flip=4&ft=1.2` },
  { name: "pack-peak-e-mythic-dark-desk", vp: "desk", q: `${OPEN}&flip=4&ft=1.2` },
  { name: "pack-peak-e-mythic-after", vp: "phone", q: `${OPEN}&flip=4&ft=2.9` },
  { name: "pack-peak-burst", vp: "phone", q: `pack=epic&${PULL}&seq=0.7` },
  { name: "pack-peak-burst-desk", vp: "desk", q: `pack=epic&${PULL}&seq=0.7` },
  { name: "pack-peak-burst-mythic", vp: "phone", q: `pack=mythic&${PULL}&seq=0.74` },
  // flips
  ...FLIP_MOMENTS.flatMap(([slot, r, moments]) =>
    moments.map(([n, ft]) => ({ name: `pack-flip-${r}-${n}`, vp: "phone", q: `${OPEN}&flip=${slot}&ft=${ft}` })),
  ),
  { name: "pack-flip-legendary-c-after-desk", vp: "desk", q: `${OPEN}&flip=3&ft=1.08` },
  { name: "pack-flip-mythic-d-after-desk", vp: "desk", q: `${OPEN}&flip=4&ft=2.42` },
  // a lesser card turned after the best is up (short version)
  { name: "pack-flip-epic-short", vp: "phone", q: `${OPEN}&revealed=4&flip=2&ft=0.5` },
  // brought forward, all revealed, the last card down being the best
  { name: "pack-focus-epic", vp: "phone", q: `${OPEN}&revealed=0,1,2,3,4&focus=2` },
  { name: "pack-focus-mythic-desk", vp: "desk", q: `${OPEN}&revealed=0,1,2,3,4&focus=4` },
  { name: "pack-all-revealed", vp: "phone", q: `${OPEN}&revealed=0,1,2,3,4` },
  { name: "pack-all-revealed-desk", vp: "desk", q: `${OPEN}&revealed=0,1,2,3,4` },
  { name: "pack-last-down", vp: "phone", q: `${OPEN}&revealed=0,1,2,3&t=0.5` },
  // reduced motion
  { name: "pack-calm-idle", vp: "calm", q: `pack=legendary` },
  { name: "pack-calm-flip", vp: "calm", q: `${OPEN}&flip=4&ft=0.2` },
];

const SHOTS = [...VIEWER, ...PACK].filter((s) => filter.split(",").some((f) => s.name.includes(f)));

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
