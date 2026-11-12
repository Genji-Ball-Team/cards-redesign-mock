import * as THREE from "three";
import { detectZones } from "./zones.js";
import { ZONE_OVERRIDES } from "../data/zoneOverrides.js";

// Derives a surface map from a finished card image at runtime. The art itself is never changed.
//   r, g: relief normal from luminance (ink relief / embossed frame), 0.5 = flat
//   b:    calm: 1 where the neighbourhood is quiet and dark, 0 where it is already busy
//         (dense detail, bright strokes like painted lightning). Normalised per card, so every
//         card's own calmest areas count as calm. Mythic lets its veins live there.
//   a:    local detail (edge energy), used to keep foil and glitter off fine type
// and a zone map from the card's own layout (zones.js): r window, g frame, b art-window depth.

export const MW = 320;
export const MH = 440;

export function boxBlur(src, w, h, r, passes = 2) {
  const a = Float32Array.from(src);
  const b = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = acc / (2 * r + 1);
        const add = a[y * w + Math.min(w - 1, x + r + 1)];
        const sub = a[y * w + Math.max(0, x - r)];
        acc += add - sub;
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        const add = b[Math.min(h - 1, y + r + 1) * w + x];
        const sub = b[Math.max(0, y - r) * w + x];
        acc += add - sub;
      }
    }
  }
  return a;
}

function pixels(image, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

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

export function analyzeCard(image, id) {
  const px = pixels(image, MW, MH);
  const n = MW * MH;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  }
  const height = boxBlur(lum, MW, MH, 1, 1);

  const at = (x, y) => height[Math.min(MH - 1, Math.max(0, y)) * MW + Math.min(MW - 1, Math.max(0, x))];
  const edge = new Float32Array(n);
  const data = new Uint8Array(n * 4);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      // image rows run top-down; texture row 0 is the bottom (uv.y = 0), so flip as we write
      const gx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const gy = (at(x, y - 1) - at(x, y + 1)) * 0.5; // +y up in uv space
      edge[y * MW + x] = Math.hypot(gx, gy);
      const o = ((MH - 1 - y) * MW + x) * 4;
      data[o] = Math.round(Math.min(1, Math.max(0, 0.5 - gx * 3)) * 255);
      data[o + 1] = Math.round(Math.min(1, Math.max(0, 0.5 - gy * 3)) * 255);
    }
  }
  const detail = boxBlur(edge, MW, MH, 2, 1);
  const calm = calmMap(edge, lum);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const o = ((MH - 1 - y) * MW + x) * 4;
      data[o + 2] = Math.round(calm[y * MW + x] * 255);
      data[o + 3] = Math.round(Math.min(1, detail[y * MW + x] * 8) * 255);
    }
  }

  const z = zonesFrom(px, id);
  const zd = new Uint8Array(n * 4);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      const o = ((MH - 1 - y) * MW + x) * 4;
      zd[o] = Math.round(z.window[i] * 255);
      zd[o + 1] = Math.round(z.frame[i] * 255);
      zd[o + 2] = Math.round(z.depth[i] * 255);
      zd[o + 3] = 255;
    }
  }
  return { map: dataTexture(data), zones: dataTexture(zd), info: z.info };
}

function dataTexture(data) {
  const tex = new THREE.DataTexture(data, MW, MH, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Per-card zones (see zones.js), with any hand corrections from data/zoneOverrides.js applied.
export function measureZones(image, id) {
  return zonesFrom(pixels(image, MW, MH), id);
}

function zonesFrom(px, id) {
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
