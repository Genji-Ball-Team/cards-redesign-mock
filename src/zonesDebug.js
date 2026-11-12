// Draws the per-card zone detection for inspection (zones.html, dev only).
import { CARDS } from "./data/cards.js";
import { measureZones, MW, MH } from "./card/analyze.js";

const load = (id) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = `/cards/${id}.webp`;
  });

const only = new URLSearchParams(location.search).get("only")?.split(",");
const big = only != null;
if (big) document.body.style.gridTemplateColumns = "repeat(4, 640px)";
const report = {};
for (const card of CARDS.filter((c) => !only || only.includes(c.id))) {
  const img = await load(card.id);
  const z = measureZones(img, card.id);
  const fig = document.createElement("figure");
  const a = document.createElement("canvas");
  const b = document.createElement("canvas");
  for (const c of [a, b]) {
    c.width = MW;
    c.height = MH;
    c.getContext("2d").drawImage(img, 0, 0, MW, MH);
  }
  const ctx = b.getContext("2d");
  const id = ctx.getImageData(0, 0, MW, MH);
  for (let i = 0; i < MW * MH; i++) {
    const o = i * 4;
    const f = z.frame[i] * 0.45;
    const d = z.depth[i] * 0.4;
    id.data[o] = id.data[o] * (1 - f - d) + 255 * f + 40 * d;
    id.data[o + 1] = id.data[o + 1] * (1 - f - d) + 140 * f + 120 * d;
    id.data[o + 2] = id.data[o + 2] * (1 - f - d) + 0 * f + 255 * d;
  }
  ctx.putImageData(id, 0, 0);
  const s = z.info;
  // window outline
  const line = (pts, pres) => {
    for (let k = 1; k < pts.length; k++) {
      const p = pres ? pres[k] : 0;
      ctx.strokeStyle = p > 0.5 ? "#3f6" : "rgba(255,255,60,0.9)";
      ctx.setLineDash(p > 0.5 ? [] : [2, 2]);
      ctx.lineWidth = p > 0.5 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(...pts[k - 1]);
      ctx.lineTo(...pts[k]);
      ctx.stroke();
    }
  };
  if (s.winBottom) {
    line([...s.winBottom].map((y, x) => [x, y]), s.winBottomPres);
    if (s.winTop) line([...s.winTop].map((y, x) => [x, y]), s.winTopPres);
    line([...s.sides.left].map((x, y) => [x, y]), s.leftPres);
    line([...s.sides.right].map((x, y) => [MW - 1 - x, y]), s.rightPres);
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = "#f33";
  ctx.lineWidth = 1;
  const o = s.outline;
  ctx.beginPath();
  ctx.roundRect(o.inset.l, o.inset.t, MW - o.inset.l - o.inset.r, MH - o.inset.t - o.inset.b, o.radius);
  ctx.stroke();
  if (s.stamp) {
    ctx.strokeStyle = "#f0f";
    const [x0, y0, x1, y1] = s.stamp;
    ctx.strokeRect(x0 * MW, (1 - y1) * MH, (x1 - x0) * MW, (y1 - y0) * MH);
  }
  const cap = document.createElement("figcaption");
  cap.textContent = `${card.id}  conf ${s.confidence}  depth ${s.depthOn ? "on" : "off"}  r ${o.radius.toFixed(1)}px  inset ${Object.values(o.inset).map((v) => v.toFixed(1)).join("/")}`;
  if (big) b.style.cssText = "width:640px;height:880px";
  fig.append(...(big ? [b] : [a, b]), cap);
  document.body.append(fig);
  let ds = 0, ws = 0;
  for (let i = 0; i < MW * MH; i++) { ds += z.depth[i]; ws += z.window[i]; }
  report[card.id] = { depthMean: +(ds / Math.max(1, ws)).toFixed(2), confidence: s.confidence, depthOn: s.depthOn, outline: o, barY: s.barY, headY: s.headY, found: s.found, windowShare: s.windowShare, stamp: s.stamp, override: s.override ?? null };
}
window.__report = report;
window.__ready = true;
