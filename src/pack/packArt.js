import * as THREE from "three";
import { drawTracked } from "../card/text.js";
import { boxBlur } from "../card/blur.js";
import { PACK_W, PACK_H, SEAL_H } from "./packMesh.js";

// The pouch's printed faces, drawn per pack type into a colour canvas and a mask:
//   r = bare foil (no ink: the metal shows, its colour is the colour canvas)
//   g = gloss varnish on ink
//   b = emboss height
//   a = holographic film (rainbow interference on foil)
// Front: the Genji Ball mark, the wordmark and the pack type over a printed field, cut by one
// diagonal stripe of bare foil at the angle of the logo's blade, with the showroom's floor grid
// printed at the foot. Back: plain field, a slash lattice and a small mark.

const W = 720;
const H = Math.round((W * PACK_H) / PACK_W);
const SEAL = Math.round((SEAL_H / PACK_H) * H);
const CX = W / 2;
const CUT = { x: 12 / 13, y: -8.4 / 13 }; // the logo's blade, as in card/backTexture.js
const ANG = Math.atan2(CUT.y, CUT.x);

function canvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

function linearToCss([r, g, b]) {
  const f = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));
  return `rgb(${f(r)} ${f(g)} ${f(b)})`;
}

function logoPath(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// the ball with the blade cut through it, as a true gap
function drawMark(ctx, x, y, r, fill) {
  const layer = canvas();
  const l = layer.getContext("2d");
  l.fillStyle = fill;
  logoPath(l, x, y, r);
  l.fill();
  l.globalCompositeOperation = "destination-out";
  l.lineWidth = (3.5 / 13) * r;
  l.lineCap = "round";
  l.beginPath();
  l.moveTo(x - CUT.x * r * 1.25, y - CUT.y * r * 1.25);
  l.lineTo(x + CUT.x * r * 1.25, y + CUT.y * r * 1.25);
  l.stroke();
  ctx.drawImage(layer, 0, 0);
}

const LOGO_Y = Math.round(H * 0.33);
const LOGO_R = Math.round(W * 0.2);

// the diagonal stripe of bare foil, through the logo at the blade's angle
function stripe(ctx) {
  ctx.save();
  ctx.translate(CX, LOGO_Y);
  ctx.rotate(ANG);
  ctx.beginPath();
  ctx.rect(-W * 1.5, -LOGO_R * 0.16, W * 3, LOGO_R * 0.32);
  ctx.restore();
}

function frame(ctx, inset, r) {
  ctx.beginPath();
  ctx.roundRect(inset, SEAL + inset * 0.6, W - inset * 2, H - SEAL * 2 - inset * 1.2, r);
}

function floorGrid(ctx) {
  // perspective floor: a horizon line and receding lines toward a vanishing point
  const top = H - SEAL - Math.round(H * 0.2);
  const bot = H - SEAL - 26;
  const vx = CX;
  const vy = top - 120;
  ctx.save();
  ctx.beginPath();
  ctx.rect(30, top, W - 60, bot - top);
  ctx.clip();
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(vx + i * 6, vy);
    ctx.lineTo(vx + i * 120, bot + 200);
    ctx.stroke();
  }
  for (let k = 0; k < 9; k++) {
    const z = 1 / (1 + k * 0.55);
    const y = top + (bot - top) * (1 - z) * 1.25;
    if (y > bot) break;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(40, top);
  ctx.lineTo(W - 40, top);
  ctx.stroke();
}

function drawFront(ctx, type, pass) {
  const L = type.look;
  const white = "#fff";
  const isCol = pass === "color";
  const foilCss = linearToCss(L.foil);
  const ch = (name) => pass === name || isCol;
  // stock: printed ink everywhere except the seals (bare foil)
  if (isCol) {
    const g = ctx.createRadialGradient(CX, LOGO_Y, 30, CX, H * 0.45, H * 0.8);
    g.addColorStop(0, L.inkHi);
    g.addColorStop(1, L.ink);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = foilCss;
    ctx.fillRect(0, 0, W, SEAL);
    ctx.fillRect(0, H - SEAL, W, SEAL);
  } else if (pass === "foil") {
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, W, SEAL);
    ctx.fillRect(0, H - SEAL, W, SEAL);
  }
  // concentric rings round the mark (gloss varnish)
  if (ch("gloss")) {
    ctx.save();
    frame(ctx, 26, 18);
    ctx.clip();
    ctx.strokeStyle = isCol ? L.inkHi : white;
    for (let r = LOGO_R + 60, i = 0; r < H; r += 20, i++) {
      ctx.globalAlpha = (isCol ? 0.7 : 0.9) * Math.max(0, 1 - (r - LOGO_R) / (H * 0.7));
      ctx.lineWidth = i % 4 === 0 ? 3 : 1.2;
      ctx.beginPath();
      ctx.arc(CX, LOGO_Y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // the bare-foil stripe at the blade's angle (holo film on it)
  if (isCol || pass === "foil" || pass === "holo") {
    ctx.save();
    frame(ctx, 26, 18);
    ctx.clip();
    stripe(ctx);
    ctx.fillStyle = isCol ? foilCss : white;
    ctx.fill();
    ctx.restore();
  }
  // frame rules in foil
  if (isCol || pass === "foil" || pass === "emboss" || pass === "holo") {
    ctx.strokeStyle = isCol ? foilCss : white;
    ctx.lineWidth = 6;
    frame(ctx, 22, 20);
    ctx.stroke();
    ctx.lineWidth = 2;
    frame(ctx, 36, 12);
    ctx.stroke();
  }
  // the mark: green ink, glossy, embossed; a dark ring round it so it sits on the stripe
  if (isCol) {
    ctx.fillStyle = L.ink;
    logoPath(ctx, CX, LOGO_Y, LOGO_R + 18);
    ctx.fill();
    ctx.strokeStyle = foilCss;
    ctx.lineWidth = 4;
    logoPath(ctx, CX, LOGO_Y, LOGO_R + 30);
    ctx.stroke();
    const g = ctx.createRadialGradient(CX - LOGO_R * 0.3, LOGO_Y - LOGO_R * 0.4, 10, CX, LOGO_Y, LOGO_R);
    g.addColorStop(0, "oklch(84% 0.13 158)");
    g.addColorStop(1, "oklch(64% 0.13 158)");
    drawMark(ctx, CX, LOGO_Y, LOGO_R, g);
  } else if (pass === "foil") {
    // the dark ring takes the stripe's foil away round the mark; keep the outer rule foil
    ctx.fillStyle = "#000";
    logoPath(ctx, CX, LOGO_Y, LOGO_R + 18);
    ctx.fill();
    ctx.strokeStyle = white;
    ctx.lineWidth = 4;
    logoPath(ctx, CX, LOGO_Y, LOGO_R + 30);
    ctx.stroke();
  } else if (pass === "holo") {
    ctx.fillStyle = "#000";
    logoPath(ctx, CX, LOGO_Y, LOGO_R + 18);
    ctx.fill();
  } else if (pass === "gloss" || pass === "emboss") {
    drawMark(ctx, CX, LOGO_Y, LOGO_R, white);
    if (pass === "emboss") {
      ctx.strokeStyle = white;
      ctx.lineWidth = 4;
      logoPath(ctx, CX, LOGO_Y, LOGO_R + 30);
      ctx.stroke();
    }
  }
  // wordmark in foil, embossed
  const wordY = Math.round(H * 0.6);
  if (isCol || pass === "foil" || pass === "emboss") {
    ctx.fillStyle = isCol ? L.label : white;
    drawTracked(ctx, "GENJI BALL", CX, wordY, { size: 98, weight: 800, tracking: 6 });
  }
  // pack type, in the type's trim
  if (isCol || pass === "foil" || pass === "emboss") {
    ctx.fillStyle = isCol ? L.trim : white;
    drawTracked(ctx, type.label.toUpperCase(), CX, wordY + 74, { size: 52, weight: 760, tracking: 16 });
  }
  if (isCol || pass === "gloss") {
    ctx.fillStyle = isCol ? L.label : white;
    ctx.globalAlpha = isCol ? 0.55 : 1;
    drawTracked(ctx, "TRADING CARDS  ·  5 CARDS", CX, wordY + 122, { size: 24, weight: 700, tracking: 7 });
    ctx.globalAlpha = 1;
  }
  // the showroom floor grid, printed in the trim colour with gloss
  if (isCol || pass === "gloss") {
    ctx.strokeStyle = isCol ? L.trim : white;
    ctx.globalAlpha = isCol ? 0.35 : 1;
    ctx.lineWidth = 2;
    floorGrid(ctx);
    ctx.globalAlpha = 1;
  }
}

function drawBack(ctx, type, pass) {
  const L = type.look;
  const isCol = pass === "color";
  const white = "#fff";
  const foilCss = linearToCss(L.foil);
  if (isCol) {
    ctx.fillStyle = L.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = foilCss;
    ctx.fillRect(0, 0, W, SEAL);
    ctx.fillRect(0, H - SEAL, W, SEAL);
    // the fin seal down the middle is bare foil
    ctx.fillRect(CX - 26, 0, 52, H);
  } else if (pass === "foil") {
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, W, SEAL);
    ctx.fillRect(0, H - SEAL, W, SEAL);
    ctx.fillRect(CX - 26, 0, 52, H);
  }
  if (isCol || pass === "gloss") {
    ctx.strokeStyle = isCol ? L.inkHi : white;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const dx = Math.cos(ANG) * 12;
    const dy = Math.sin(ANG) * 12;
    for (let y = SEAL + 30, row = 0; y < H - SEAL - 10; y += 40, row++) {
      for (let x = 30 + (row % 2) * 30; x < W; x += 60) {
        if (Math.abs(x - CX) < 50) continue;
        ctx.beginPath();
        ctx.moveTo(x - dx, y - dy);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
      }
    }
  }
  if (isCol || pass === "emboss" || pass === "gloss") {
    const y = H - SEAL - 90;
    if (isCol) {
      ctx.fillStyle = L.ink;
      ctx.fillRect(CX - 160, y - 60, 320, 110);
    }
    const g = isCol ? "oklch(76% 0.13 158)" : white;
    drawMark(ctx, CX, y - 10, 26, g);
    ctx.fillStyle = isCol ? L.label : white;
    drawTracked(ctx, "GENJI BALL", CX, y + 40, { size: 26, weight: 800, tracking: 5 });
  }
}

function grey(draw, type, pass) {
  const c = canvas();
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  draw(ctx, type, pass);
  const d = ctx.getImageData(0, 0, W, H).data;
  const out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

function faceTextures(draw, type) {
  const color = canvas();
  draw(color.getContext("2d"), type, "color");
  const foil = grey(draw, type, "foil");
  const gloss = grey(draw, type, "gloss");
  const emboss = boxBlur(grey(draw, type, "emboss"), W, H, 2, 2);
  const holo = grey(draw, type, "holo");
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = ((H - 1 - y) * W + x) * 4;
      data[o] = Math.round(foil[i] * 255);
      data[o + 1] = Math.round(gloss[i] * 255);
      data[o + 2] = Math.round(emboss[i] * 255);
      data[o + 3] = Math.round(holo[i] * 255);
    }
  }
  const col = new THREE.CanvasTexture(color);
  col.colorSpace = THREE.SRGBColorSpace;
  col.anisotropy = 8;
  const mask = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  mask.generateMipmaps = true;
  mask.minFilter = THREE.LinearMipmapLinearFilter;
  mask.magFilter = THREE.LinearFilter;
  mask.needsUpdate = true;
  return { col, mask };
}

const cache = new Map();

export function packTextures(type) {
  if (!cache.has(type.id)) {
    cache.set(type.id, { front: faceTextures(drawFront, type), back: faceTextures(drawBack, type), texel: [1 / W, 1 / H] });
  }
  return cache.get(type.id);
}
