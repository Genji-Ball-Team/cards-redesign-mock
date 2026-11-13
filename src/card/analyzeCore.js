import { boxBlur } from "./blur.js";
import { detectZones } from "./zones.js";
import { ZONE_OVERRIDES } from "../data/zoneOverrides.js";

// The arithmetic behind analyze.js, on plain pixel arrays: no DOM and no three, so it runs in a
// worker (analyze.worker.js) as well as on the page.

export const MW = 320;
export const MH = 440;

function calmMap(edge, lum) {
  const n = MW * MH;
  const bright = new Float32Array(n);
  for (let i = 0; i < n; i++) bright[i] = Math.max(0, lum[i] - 0.3);
  const e = boxBlur(edge, MW, MH, 7, 2);
  const b = boxBlur(bright, MW, MH, 7, 2);
  const busy = new Float32Array(n);
  for (let i = 0; i < n; i++) busy[i] = e[i] * 6 + b[i] * 2.2;
  const sorted = Float32Array.from(busy).sort();
  const lo = sorted[Math.floor(n * 0.2)];
  const hi = sorted[Math.floor(n * 0.75)];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, (busy[i] - lo) / (hi - lo || 1)));
    out[i] = 1 - t * t * (3 - 2 * t);
  }
  return boxBlur(out, MW, MH, 3, 1);
}

// px: RGBA bytes of the card image scaled to MW x MH, rows top-down.
// Returns the surface map and the zone map as RGBA bytes (rows bottom-up, ready for a texture)
// and the zones' measurements.
export function analyzePixels(px, id) {
  const n = MW * MH;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  }
  const height = boxBlur(lum, MW, MH, 1, 1);

  const at = (x, y) => height[Math.min(MH - 1, Math.max(0, y)) * MW + Math.min(MW - 1, Math.max(0, x))];
  const edge = new Float32Array(n);
  const map = new Uint8Array(n * 4);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      // image rows run top-down; texture row 0 is the bottom (uv.y = 0), so flip as we write
      const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const gy = (at(x, y - 1) - at(x, y + 1)) * 0.5; // +y up in uv space
      edge[y * MW + x] = Math.hypot(gx, gy);
      const o = ((MH - 1 - y) * MW + x) * 4;
      map[o] = Math.round(Math.min(1, Math.max(0, 0.5 - gx * 3)) * 255);
      map[o + 1] = Math.round(Math.min(1, Math.max(0, 0.5 - gy * 3)) * 255);
    }
  }
  const detail = boxBlur(edge, MW, MH, 2, 1);
  const calm = calmMap(edge, lum);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const o = ((MH - 1 - y) * MW + x) * 4;
      map[o + 2] = Math.round(calm[y * MW + x] * 255);
      map[o + 3] = Math.round(Math.min(1, detail[y * MW + x] * 8) * 255);
    }
  }

  const z = zonesFrom(px, id);
  const zones = new Uint8Array(n * 4);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      const o = ((MH - 1 - y) * MW + x) * 4;
      zones[o] = Math.round(z.window[i] * 255);
      zones[o + 1] = Math.round(z.frame[i] * 255);
      zones[o + 2] = Math.round(z.depth[i] * 255);
      zones[o + 3] = 255;
    }
  }
  return { map, zones, info: z.info };
}

// Per-card zones (see zones.js), with any hand corrections from data/zoneOverrides.js applied.
export function zonesFrom(px, id) {
  const z = detectZones(px, MW, MH);
  const o = ZONE_OVERRIDES[id] ?? {};
  z.info.override = Object.keys(o).length ? o : null;
  z.info.depthOn = o.depth ?? z.info.confidence >= 0.6;
  if (o.stamp) {
    // hand-placed stamp: top-left corner in analysis pixels (MW x MH), same size as detected
    const [x0, y0] = o.stamp;
    const [a, b, c, d] = z.info.stamp;
    const sw = c - a;
    const sh = d - b;
    z.info.stamp = [x0 / MW, 1 - y0 / MH - sh, x0 / MW + sw, 1 - y0 / MH];
  }
  return z;
}
