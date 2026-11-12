// Contact sheet of screenshots, for reviewing many at once.
//   node scripts/sheet.mjs <out-name> <substring> [<substring> ...] [--crop] [--zoom]
// Puts every shots/*.png whose name contains one of the substrings side by side (headless Edge)
// and writes shots/sheet-<out-name>.png. --crop keeps the middle 70% of the height (the card),
// --zoom shows the art window about twice as large (for side-by-side detail), --big shows the
// upper card large, in two rows (for on / off pairs).
import { chromium } from "playwright-core";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "shots");
const args = process.argv.slice(2);
const crop = args.includes("--crop");
const zoom = args.includes("--zoom");
const big = args.includes("--big");
const [name, ...subs] = args.filter((a) => a !== "--crop" && a !== "--zoom" && a !== "--big");
const files = (await readdir(dir)).filter((f) => f.endsWith(".png") && !f.startsWith("sheet-") && subs.some((s) => f.includes(s)));

const cells = await Promise.all(
  files.map(async (f) => {
    const b64 = (await readFile(path.join(dir, f))).toString("base64");
    return `<figure><div class="img${crop ? " crop" : ""}${zoom ? " zoom" : ""}${big ? " big" : ""}" style="background-image:url(data:image/png;base64,${b64})"></div><figcaption>${f}</figcaption></figure>`;
  }),
);

const cols = big ? Math.ceil(files.length / 2) : Math.min(files.length, 5);
const cw = big ? 640 : 360;
const html = `<style>
body{margin:0;background:#222;font:12px sans-serif;color:#ccc;display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:6px;padding:6px}
figure{margin:0}.img{width:360px;height:${crop ? 560 : 780}px;background-size:contain;background-repeat:no-repeat;background-position:center}
.img.crop{background-size:auto 800px}
.img.big{width:640px;height:760px;background-size:auto 1500px;background-position:50% 36%}
.img.zoom{background-size:auto 1700px;background-position:50% 42%}
</style>${cells.join("")}`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: cols * (cw + 6) + 6, height: 400 } });
await page.setContent(html);
await page.screenshot({ path: path.join(dir, `sheet-${name}.png`), fullPage: true });
await browser.close();
console.log(`shots/sheet-${name}.png  (${files.length} images)`);
