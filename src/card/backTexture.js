import * as THREE from "three";
import { drawTracked } from "./text.js";
import { boxBlur } from "./analyze.js";

// The card back, drawn once per variant into a colour canvas plus a mask canvas
// (r = foil, g = spot gloss, b = emboss height). Laid out like a classic TCG back: a framed
// field with a pattern radiating from the emblem, the Genji Ball mark in the middle and the
// wordmark under it.
//
// Variants: "dark" is near-black stock where the green mark is the only colour (rules and type
// in neutral gunmetal / silver foil); "green" is a dark green-tinted stock with pale green foil.

const W = 1024;
const H = 1408;
const MW = 1024;
const MH = 1408;

const PALETTES = {
  dark: {
    inner: "oklch(17% 0.006 215)",
    outer: "oklch(8.5% 0.005 220)",
    band: "oklch(6% 0.004 220)",
    pattern: "oklch(24% 0.006 215)",
    patternBand: "oklch(13% 0.004 220)",
    foil: "oklch(66% 0.008 215)",
    type: "oklch(90% 0.004 215)",
    typeSoft: "oklch(58% 0.006 215)",
    ball: "oklch(79% 0.132 158)",
    ballDeep: "oklch(64% 0.13 158)",
  },
  green: {
    inner: "oklch(30% 0.07 162)",
    outer: "oklch(15% 0.045 166)",
    band: "oklch(11% 0.03 168)",
    pattern: "oklch(38% 0.08 160)",
    patternBand: "oklch(19% 0.045 166)",
    foil: "oklch(82% 0.07 156)",
    type: "oklch(95% 0.03 156)",
    typeSoft: "oklch(72% 0.07 158)",
    ball: "oklch(82% 0.14 156)",
    ballDeep: "oklch(66% 0.14 158)",
  },
};

const CX = W / 2;
const LOGO_Y = 620;
const BALL_R = 196;
const MARGIN = 44; // outer border band
const R_OUT = 42; // matches the geometry's corner radius at this scale

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// The blade cut, as in favicon.svg: from (4, 24.4) to (28, 7.6) on a 32 grid, ball r = 13.
const CUT = { x: 12 / 13, y: -8.4 / 13 };

function ballPath(ctx, r) {
  ctx.beginPath();
  ctx.arc(CX, LOGO_Y, r, 0, Math.PI * 2);
}

function cutLine(ctx, r, extend = 1) {
  ctx.beginPath();
  ctx.moveTo(CX - CUT.x * r * extend, LOGO_Y - CUT.y * r * extend);
  ctx.lineTo(CX + CUT.x * r * extend, LOGO_Y + CUT.y * r * extend);
}

// Elements, each drawn in the colour pass and in whichever mask channels it belongs to.
function drawField(ctx, p, pass) {
  // stock
  if (pass === "color") {
    const g = ctx.createRadialGradient(CX, LOGO_Y, 40, CX, LOGO_Y, H * 0.75);
    g.addColorStop(0, p.inner);
    g.addColorStop(1, p.outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // border band
    ctx.fillStyle = p.band;
    roundRect(ctx, 0, 0, W, H, R_OUT);
    roundRect(ctx, MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2, 22);
    ctx.fill("evenodd");
  }
}

function drawPattern(ctx, p, pass) {
  const ink = pass === "color" ? p.pattern : "#fff";
  ctx.save();
  roundRect(ctx, MARGIN + 18, MARGIN + 18, W - (MARGIN + 18) * 2, H - (MARGIN + 18) * 2, 14);
  ctx.clip();
  // concentric rings radiating from the emblem
  ctx.strokeStyle = ink;
  for (let r = BALL_R + 70, i = 0; r < 1100; r += 22, i++) {
    ctx.globalAlpha = (pass === "color" ? 0.9 : 1) * Math.max(0, 1 - (r - BALL_R) / 900);
    ctx.lineWidth = i % 4 === 0 ? 3.2 : 1.4;
    ctx.beginPath();
    ctx.arc(CX, LOGO_Y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // blade slashes at the logo's angle, a staggered lattice that fades towards the emblem
  ctx.lineCap = "round";
  const ang = Math.atan2(CUT.y, CUT.x);
  const dx = Math.cos(ang) * 15;
  const dy = Math.sin(ang) * 15;
  for (let y = 70, row = 0; y < H; y += 46, row++) {
    for (let x = 60 + (row % 2) * 34; x < W; x += 68) {
      const d = Math.hypot(x - CX, y - LOGO_Y);
      const fade = Math.min(1, Math.max(0, (d - BALL_R - 160) / 260));
      if (fade <= 0) continue;
      ctx.globalAlpha = fade * (pass === "color" ? 0.85 : 1);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
    }
  }
  ctx.restore();
  // fine hatching in the border band
  ctx.save();
  roundRect(ctx, 0, 0, W, H, R_OUT);
  roundRect(ctx, MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2, 22);
  ctx.clip("evenodd");
  ctx.strokeStyle = pass === "color" ? p.patternBand : "#fff";
  ctx.globalAlpha = pass === "color" ? 1 : 0.6;
  ctx.lineWidth = 2;
  for (let x = -H; x < W + H; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + H * 0.7, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRules(ctx, p, pass) {
  const ink = pass === "color" ? p.foil : "#fff";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  // double rule round the field
  ctx.lineWidth = 4;
  roundRect(ctx, MARGIN + 10, MARGIN + 10, W - (MARGIN + 10) * 2, H - (MARGIN + 10) * 2, 18);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  roundRect(ctx, MARGIN + 22, MARGIN + 22, W - (MARGIN + 22) * 2, H - (MARGIN + 22) * 2, 10);
  ctx.stroke();
  // corner notches: a small blade cut across each corner of the inner rule
  const c = MARGIN + 22;
  const corners = [
    [c, c, 1, 1],
    [W - c, c, -1, 1],
    [c, H - c, 1, -1],
    [W - c, H - c, -1, -1],
  ];
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * 10, y + sy * 46);
    ctx.lineTo(x + sx * 46, y + sy * 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + sx * 24, y + sy * 24, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // halo rings round the emblem
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CX, LOGO_Y, BALL_R + 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(CX, LOGO_Y, BALL_R + 50, 0, Math.PI * 2);
  ctx.stroke();
  // the blade's path continues past the ball out to the outer halo
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, LOGO_Y, BALL_R + 50, 0, Math.PI * 2);
  ctx.arc(CX, LOGO_Y, BALL_R + 14, 0, Math.PI * 2, true);
  ctx.clip("evenodd");
  cutLine(ctx, BALL_R + 50, 1.0 / 1.0);
  ctx.stroke();
  ctx.restore();
  // wordmark rule and small diamonds
  const y = 1012;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 250, y);
  ctx.lineTo(CX - 18, y);
  ctx.moveTo(CX + 18, y);
  ctx.lineTo(CX + 250, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX, y - 8);
  ctx.lineTo(CX + 8, y);
  ctx.lineTo(CX, y + 8);
  ctx.lineTo(CX - 8, y);
  ctx.closePath();
  ctx.fill();
}

function drawEmblem(ctx, p, pass) {
  // the ball with the blade cut through it, drawn on its own layer so the cut is a true gap
  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const l = layer.getContext("2d");
  l.setTransform(ctx.getTransform());
  if (pass === "color") {
    const g = l.createRadialGradient(CX - 60, LOGO_Y - 80, 20, CX, LOGO_Y, BALL_R);
    g.addColorStop(0, p.ball);
    g.addColorStop(1, p.ballDeep);
    l.fillStyle = g;
  } else {
    l.fillStyle = "#fff";
  }
  ballPath(l, BALL_R);
  l.fill();
  l.globalCompositeOperation = "destination-out";
  l.lineWidth = (3.5 / 13) * BALL_R;
  l.lineCap = "round";
  cutLine(l, BALL_R, 1.2);
  l.stroke();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

function drawTitle(ctx, p, pass) {
  ctx.fillStyle = pass === "color" ? p.type : "#fff";
  drawTracked(ctx, "GENJI BALL", CX, 960, { size: 132, weight: 800, tracking: 8 });
}

// The small tagline is flat foil: embossing type this thin turns its strokes into bevel noise.
function drawTagline(ctx, p, pass) {
  ctx.fillStyle = pass === "color" ? p.typeSoft : "#fff";
  drawTracked(ctx, "TRADING CARD GAME", CX, 1074, { size: 38, weight: 700, tracking: 12 });
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function grey(drawFns, p, pass) {
  const c = canvas(MW, MH);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MW, MH);
  ctx.scale(MW / W, MH / H);
  for (const fn of drawFns) fn(ctx, p, pass);
  const d = ctx.getImageData(0, 0, MW, MH).data;
  const out = new Float32Array(MW * MH);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

export function createBackTextures(variant) {
  const p = PALETTES[variant];
  const color = canvas(W, H);
  const ctx = color.getContext("2d");
  drawField(ctx, p, "color");
  drawPattern(ctx, p, "color");
  drawRules(ctx, p, "color");
  drawEmblem(ctx, p, "color");
  drawTitle(ctx, p, "color");
  drawTagline(ctx, p, "color");

  const foil = grey([drawRules, drawEmblem, drawTitle, drawTagline], p, "mask");
  const gloss = grey([drawPattern], p, "mask");
  const raised = boxBlur(grey([drawRules, drawEmblem, drawTitle], p, "mask"), MW, MH, 2, 2);
  const emblemOnly = boxBlur(grey([drawEmblem], p, "mask"), MW, MH, 6, 2);
  const mask = new Uint8Array(MW * MH * 4);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      const o = ((MH - 1 - y) * MW + x) * 4; // flip: texture row 0 is the bottom
      mask[o] = Math.round(foil[i] * 255);
      mask[o + 1] = Math.round(gloss[i] * 255);
      mask[o + 2] = Math.round(Math.min(1, raised[i] * 0.6 + emblemOnly[i] * 0.5) * 255);
      mask[o + 3] = 255;
    }
  }

  const colorTex = new THREE.CanvasTexture(color);
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = 8;
  const maskTex = new THREE.DataTexture(mask, MW, MH, THREE.RGBAFormat);
  maskTex.generateMipmaps = true;
  maskTex.minFilter = THREE.LinearMipmapLinearFilter;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.needsUpdate = true;
  return { color: colorTex, mask: maskTex, edgeTint: variant === "green" ? [0.02, 0.05, 0.035] : [0.012, 0.013, 0.014] };
}
