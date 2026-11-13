import * as THREE from "three";
import { boxBlur } from "./analyze.js";

// The card back, drawn once into a colour canvas plus a mask canvas
// (r = foil, g = spot gloss, b = emboss height). Laid out like a classic TCG back: a framed
// field with a pattern radiating from the emblem, and the Genji Ball mark as a medallion in the
// middle, "GENJI BALL" engraved round it on a ring.
//
// Near-black stock where the green mark is the only colour (rules and type in neutral gunmetal /
// silver foil). The owner picked this over a green-tinted variant (2026-11-13).
//
// The back reads the same either way up: everything is symmetric under a half turn about the
// centre (the ring text is set twice, the second copy turned 180 degrees).

const W = 1024;
const H = 1408;
const MW = 1024;
const MH = 1408;

// the engraved name ring round the medallion (false: the medallion alone)
const RING_TEXT = true;

const PALETTE = {
  inner: "oklch(17% 0.006 215)",
  outer: "oklch(8.5% 0.005 220)",
  band: "oklch(6% 0.004 220)",
  pattern: "oklch(24% 0.006 215)",
  patternBand: "oklch(13% 0.004 220)",
  foil: "oklch(66% 0.008 215)",
  ringType: "oklch(70% 0.006 215)",
  ball: "oklch(79% 0.132 158)",
  ballDeep: "oklch(64% 0.13 158)",
};

const CX = W / 2;
const LOGO_Y = H / 2;
const BALL_R = 196;
const MARGIN = 44; // outer border band
const R_OUT = 42; // matches the geometry's corner radius at this scale
// the name ring: two rules with the type between them
const RING_IN = BALL_R + 70;
const RING_OUT = BALL_R + 136;
const TYPE_SIZE = 46;
const TYPE_BASE = RING_IN + 16; // baseline radius; the caps stand outward from it
const PATTERN_FROM = RING_TEXT ? RING_OUT + 18 : BALL_R + 70;

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

// Draws fn twice: as is, and turned half a turn about the centre.
function twice(ctx, fn) {
  fn();
  ctx.save();
  ctx.translate(CX, LOGO_Y);
  ctx.rotate(Math.PI);
  ctx.translate(-CX, -LOGO_Y);
  fn();
  ctx.restore();
}

// Elements, each drawn in the colour pass and in whichever mask channels it belongs to.
function drawField(ctx, p, pass) {
  // stock
  if (pass === "color") {
    const g = ctx.createRadialGradient(CX, LOGO_Y, 40, CX, LOGO_Y, H * 0.6);
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
  // concentric rings radiating from the medallion
  ctx.strokeStyle = ink;
  for (let r = PATTERN_FROM, i = 0; r < 1100; r += 22, i++) {
    ctx.globalAlpha = (pass === "color" ? 0.9 : 1) * Math.max(0, 1 - (r - PATTERN_FROM) / 820);
    ctx.lineWidth = i % 4 === 0 ? 3.2 : 1.4;
    ctx.beginPath();
    ctx.arc(CX, LOGO_Y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // blade slashes at the logo's angle, a staggered lattice centred on the medallion (so a half
  // turn maps it onto itself) that fades towards it
  ctx.lineCap = "round";
  const ang = Math.atan2(CUT.y, CUT.x);
  const dx = Math.cos(ang) * 15;
  const dy = Math.sin(ang) * 15;
  for (let row = -16; row <= 16; row++) {
    const y = LOGO_Y + row * 46;
    const off = Math.abs(row) % 2 ? 34 : 0;
    for (let col = -8; col <= 8; col++) {
      const x = CX + off + col * 68;
      const d = Math.hypot(x - CX, y - LOGO_Y);
      const fade = Math.min(1, Math.max(0, (d - PATTERN_FROM - 40) / 240));
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
  if (!RING_TEXT) return;
  // the name ring's rules, and a small diamond on each side between the two runs of type
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(CX, LOGO_Y, RING_IN, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(CX, LOGO_Y, RING_OUT, 0, Math.PI * 2);
  ctx.stroke();
  const mid = (RING_IN + RING_OUT) / 2;
  twice(ctx, () => {
    const x = CX + mid;
    ctx.beginPath();
    ctx.moveTo(x - 12, LOGO_Y);
    ctx.lineTo(x, LOGO_Y - 12);
    ctx.lineTo(x + 12, LOGO_Y);
    ctx.lineTo(x, LOGO_Y + 12);
    ctx.closePath();
    ctx.fill();
  });
}

function drawEmblem(ctx, p, pass) {
  // the ball with the blade cut through it, drawn on its own layer so the cut is a true gap
  const layer = document.createElement("canvas");
  layer.width = ctx.canvas.width;
  layer.height = ctx.canvas.height;
  const l = layer.getContext("2d");
  l.setTransform(ctx.getTransform());
  if (pass === "color") {
    // centred, so the shading doesn't give away which end is up
    const g = l.createRadialGradient(CX, LOGO_Y, 20, CX, LOGO_Y, BALL_R);
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

// "GENJI BALL" along the top of the ring, upright, and again along the bottom turned half a turn
// (upright when the card is). Letter by letter, each turned to follow the circle.
function drawRingText(ctx, p, pass) {
  if (!RING_TEXT) return;
  ctx.save();
  ctx.fillStyle = pass === "color" ? p.ringType : "#fff";
  ctx.font = `800 ${TYPE_SIZE}px Saira, system-ui, sans-serif`;
  let squeeze = 1;
  if ("fontStretch" in ctx) ctx.fontStretch = "condensed";
  else squeeze = 0.78;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";
  const chars = [..."GENJI BALL"];
  const tracking = 16;
  const widths = chars.map((c) => ctx.measureText(c).width * squeeze);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  twice(ctx, () => {
    let s = -total / 2; // arc length from the top, along the baseline
    for (let i = 0; i < chars.length; i++) {
      const a = (s + widths[i] / 2) / TYPE_BASE; // angle from straight up, clockwise
      ctx.save();
      ctx.translate(CX + Math.sin(a) * TYPE_BASE, LOGO_Y - Math.cos(a) * TYPE_BASE);
      ctx.rotate(a);
      ctx.scale(squeeze, 1);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      s += widths[i] + tracking;
    }
  });
  ctx.restore();
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

let cached = null;

// Shared by every card: drawn once per page.
export function createBackTextures() {
  if (cached) return cached;
  const p = PALETTE;
  const color = canvas(W, H);
  const ctx = color.getContext("2d");
  drawField(ctx, p, "color");
  drawPattern(ctx, p, "color");
  drawRules(ctx, p, "color");
  drawEmblem(ctx, p, "color");
  drawRingText(ctx, p, "color");

  const foil = grey([drawRules, drawEmblem, drawRingText], p, "mask");
  const gloss = grey([drawPattern], p, "mask");
  const raised = boxBlur(grey([drawRules, drawEmblem], p, "mask"), MW, MH, 2, 2);
  // the type is engraved: pressed in a little rather than raised
  const engraved = boxBlur(grey([drawRingText], p, "mask"), MW, MH, 1, 2);
  const emblemOnly = boxBlur(grey([drawEmblem], p, "mask"), MW, MH, 6, 2);
  const mask = new Uint8Array(MW * MH * 4);
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      const o = ((MH - 1 - y) * MW + x) * 4; // flip: texture row 0 is the bottom
      mask[o] = Math.round(foil[i] * 255);
      mask[o + 1] = Math.round(gloss[i] * 255);
      mask[o + 2] = Math.round(Math.max(0, Math.min(1, raised[i] * 0.6 + emblemOnly[i] * 0.5 + 0.12 - engraved[i] * 0.12)) * 255);
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
  cached = { color: colorTex, mask: maskTex, edgeTint: [0.012, 0.013, 0.014] };
  return cached;
}
