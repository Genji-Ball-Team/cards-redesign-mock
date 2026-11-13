import * as THREE from "three";
import { drawTracked } from "./text.js";
import { boxBlur } from "./blur.js";

// Mythic print number, e.g. "07/25", as a hot-foil stamp on its own plate:
//   r = foil glyphs, g = glyph height (for the pressed-in bevel), b = the plate, a = the plate's foil rim.
export const STAMP_W = 256;
export const STAMP_H = 96;

function layer(paint) {
  const c = document.createElement("canvas");
  c.width = STAMP_W;
  c.height = STAMP_H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, STAMP_W, STAMP_H);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  paint(ctx);
  const d = ctx.getImageData(0, 0, STAMP_W, STAMP_H).data;
  const out = new Float32Array(STAMP_W * STAMP_H);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

function plate(ctx, inset) {
  ctx.beginPath();
  ctx.roundRect(inset, inset, STAMP_W - inset * 2, STAMP_H - inset * 2, 22 - inset * 0.5);
}

export function createStampTexture(text) {
  const glyph = layer((ctx) => drawTracked(ctx, text, STAMP_W / 2, 69, { size: 58, weight: 800, tracking: 4 }));
  const height = boxBlur(glyph, STAMP_W, STAMP_H, 2, 2);
  const fill = layer((ctx) => {
    plate(ctx, 3);
    ctx.fill();
  });
  const rim = layer((ctx) => {
    ctx.lineWidth = 3;
    plate(ctx, 9);
    ctx.stroke();
  });
  const data = new Uint8Array(STAMP_W * STAMP_H * 4);
  for (let y = 0; y < STAMP_H; y++) {
    for (let x = 0; x < STAMP_W; x++) {
      const i = y * STAMP_W + x;
      const o = ((STAMP_H - 1 - y) * STAMP_W + x) * 4;
      data[o] = Math.round(glyph[i] * 255);
      data[o + 1] = Math.round(height[i] * 255);
      data[o + 2] = Math.round(fill[i] * 255);
      data[o + 3] = Math.round(rim[i] * 255);
    }
  }
  const tex = new THREE.DataTexture(data, STAMP_W, STAMP_H, THREE.RGBAFormat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
