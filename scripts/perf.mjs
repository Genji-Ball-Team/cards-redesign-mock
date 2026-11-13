// Frame-time check for the pack screen, headless: switches through the pack types, opens two
// packs in a row and lists every long frame after each step (switch, open, flip all, done), plus
// what the main thread was doing in it.
//   node scripts/perf.mjs            desktop, real GPU if the headless browser gets one
//   node scripts/perf.mjs phone      phone viewport with the CPU slowed 4x
//   node scripts/perf.mjs phone 6    ... slowed 6x
// Starts its own Vite server (a production build is closer to the live site: `vite preview`).
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phone = process.argv[2] === "phone";
const slow = Number(process.argv[3] ?? (phone ? 4 : 1));
const LONG = 25; // ms

const server = await createServer({ root, logLevel: "error", server: { port: 0 } });
await server.listen();
const url = `http://localhost:${server.httpServer.address().port}/?seed=11`;

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});
const ctx = await browser.newContext(
  phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await page.addInitScript(() => {
  window.__frames = [];
  window.__marks = [];
  window.__tasks = [];
  let last = performance.now();
  const tick = (now) => {
    window.__frames.push([now, now - last]);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__tasks.push([e.startTime, e.duration]);
  }).observe({ entryTypes: ["longtask"] });
  window.__mark = (name) => window.__marks.push([performance.now(), name]);
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__ready === true);
const gl = await page.evaluate(() => {
  const g = document.createElement("canvas").getContext("webgl2");
  const e = g.getExtension("WEBGL_debug_renderer_info");
  return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log(`renderer: ${gl}\nviewport: ${phone ? "phone" : "desktop"}, CPU x${slow}`);
if (slow > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow });
}
// (the wait also covers the page's own preparation after its first frames; set WAIT=0 to see
// what a visitor who acts at once gets)
await page.evaluate(() => window.__mark("after load"));
await page.waitForTimeout(Number(process.env.WAIT ?? 6000));

const step = async (name, key, wait) => {
  await page.evaluate((n) => window.__mark(n), name);
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
};
for (const k of ["2", "3", "4", "5", "1"]) await step(`switch to pack ${k}`, k, 1500);
for (const n of [1, 2]) {
  await step(`open ${n}`, "Enter", 3200);
  await step(`flip all ${n}`, "f", 9000);
  await step(`done ${n}`, "Enter", 2500);
}
await page.evaluate(() => window.__mark("end"));

const { frames, marks, tasks } = await page.evaluate(() => ({ frames: window.__frames, marks: window.__marks, tasks: window.__tasks }));
for (let i = 0; i < marks.length - 1; i++) {
  const [t0, name] = marks[i];
  const t1 = marks[i + 1][0];
  const seg = frames.filter(([t]) => t > t0 && t <= t1);
  const dts = seg.map(([, d]) => d).sort((a, b) => a - b);
  const long = seg.filter(([, d]) => d > LONG);
  const med = dts[dts.length >> 1] ?? 0;
  console.log(`\n${name}: ${seg.length} frames, median ${med.toFixed(1)} ms, worst ${(dts.at(-1) ?? 0).toFixed(0)} ms, ${long.length} over ${LONG} ms`);
  for (const [t, d] of long) {
    const task = tasks.filter(([s, len]) => s < t && s + len > t - d).map(([, len]) => `${len.toFixed(0)} ms task`);
    console.log(`  +${((t - d - t0) / 1000).toFixed(2)} s  ${d.toFixed(0)} ms  ${task.join(", ")}`);
  }
}

await browser.close();
await server.close();
