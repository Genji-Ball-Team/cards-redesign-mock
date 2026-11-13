// Finds where things are on one card image. Every card is generated on its own, so there is no
// shared template: frame thickness, the art window, the header and the outer border all differ
// per card, and are sometimes lopsided. Everything here is measured from the pixels.
//
// What it looks for: the painted structure lines. Frame and window edges are long, straight-ish
// lines; text and art make short edges. So edges are smeared along their own direction first,
// and a boundary is only taken where a line runs across most of the card.
//
//   frame:  the outer border band, per row (left / right) and per column (top / bottom)
//   window: the illustration area, bounded per row / column by the frame's inner line on the
//           sides, the header's line on top (if there is one) and the type bar below
//   depth:  how far the art may sink behind the frame. Full right up to a boundary where that
//           boundary's painted line is actually there; where it is missing (a badge, a banner or
//           art breaking out over the frame) the depth fades out well before it, so nothing
//           painted across the boundary gets sliced. A card whose window isn't found confidently
//           gets no depth at all.
//
// All coordinates in here are analysis pixels (w x h, y from the top of the image).

import { boxBlur } from "./blur.js";

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function median(arr, r) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const win = [];
    for (let k = Math.max(0, i - r); k <= Math.min(arr.length - 1, i + r); k++) win.push(arr[k]);
    win.sort((a, b) => a - b);
    out[i] = win[win.length >> 1];
  }
  return out;
}

function blur1(arr, r) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - r); k <= Math.min(arr.length - 1, i + r); k++) {
      s += arr[k];
      n++;
    }
    out[i] = s / n;
  }
  return out;
}

// edges smeared along one axis: 'h' keeps horizontal lines, 'v' vertical ones
function lineMaps(lum, w, h) {
  const at = (x, y) => lum[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
  const H = new Float32Array(w * h);
  const V = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const ax = Math.abs(gx);
      const ay = Math.abs(gy);
      H[y * w + x] = ay > ax * 1.3 ? ay : 0;
      V[y * w + x] = ax > ay * 1.3 ? ax : 0;
    }
  }
  // smear along the line direction (a horizontal line stays strong, a glyph fades)
  const Hs = new Float32Array(w * h);
  const Vs = new Float32Array(w * h);
  const R = 6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a = 0;
      let b = 0;
      for (let k = -R; k <= R; k++) {
        a += H[y * w + clamp(x + k, 0, w - 1)];
        b += V[clamp(y + k, 0, h - 1) * w + x];
      }
      Hs[y * w + x] = a / (2 * R + 1);
      Vs[y * w + x] = b / (2 * R + 1);
    }
  }
  return { H: Hs, V: Vs };
}

// One boundary line, followed along the card. 'get(along, across)' reads the smeared line map;
// 'across' runs from the outside in, within [lo, hi]. The line is found as a whole: every nearly
// straight line through the band (a small slant allowed, frames can be lopsided) is scored by
// its mean strength over [a0, a1), and the innermost one nearly as strong as the best wins
// (a border is often two or three parallel lines; its inner one bounds what is inside). Then the
// line is refined per sample, and 'pres' says how much it is actually painted there (0..1): low
// where a badge, banner or art crosses it.
function traceSide(get, len, lo, hi, thr, { a0 = 0, a1 = len, innermost = true } = {}) {
  const mid = (a0 + a1) / 2;
  const cands = [];
  let best = 0;
  for (let si = -6; si <= 6; si++) {
    const slope = si * 0.004;
    for (let c0 = lo; c0 <= hi; c0++) {
      let sum = 0;
      for (let a = a0; a < a1; a += 2) sum += get(a, Math.round(c0 + slope * (a - mid)));
      const v = sum / Math.ceil((a1 - a0) / 2);
      cands.push([c0, slope, v]);
      best = Math.max(best, v);
    }
  }
  const pos = new Float32Array(len);
  const pres = new Float32Array(len);
  if (best < thr * 0.5) return { pos: pos.fill(NaN), pres, found: 0, score: best };
  // the per-c0 best slant, then local maxima over c0
  const byC = new Map();
  for (const [c0, slope, v] of cands) if (!byC.has(c0) || byC.get(c0)[1] < v) byC.set(c0, [slope, v]);
  let pick = null;
  for (let c0 = lo; c0 <= hi; c0++) {
    const [slope, v] = byC.get(c0);
    if (v < best * 0.55) continue;
    if ((byC.get(c0 - 1)?.[1] ?? 0) > v || (byC.get(c0 + 1)?.[1] ?? 0) > v) continue;
    if (!pick || innermost) pick = [c0, slope];
    if (!innermost) break;
  }
  const [c0, slope] = pick;
  for (let a = 0; a < len; a++) {
    const p = Math.round(c0 + slope * (a - mid));
    let bc = p;
    let bv = -1;
    for (let c = p - 1; c <= p + 1; c++) {
      const v = get(a, c);
      if (v > bv) {
        bv = v;
        bc = c;
      }
    }
    pos[a] = bc;
  }
  const posS = blur1(median(pos, 10), 3);
  for (let a = 0; a < len; a++) {
    const c = Math.round(posS[a]);
    pres[a] = smooth(thr * 0.6, thr * 1.6, Math.max(get(a, c), get(a, c - 1), get(a, c + 1)));
  }
  const presS = blur1(median(pres, 6), 6);
  let found = 0;
  for (let a = a0; a < a1; a++) found += presS[a];
  return { pos: posS, pres: presS, found: found / (a1 - a0), score: best };
}

// The painted card's outer outline: what lies outside it is backdrop (often near-black or a
// flat colour round the corners). Measured on the diagonal at each corner and on each side.
function outerOutline(px, w, h) {
  const col = (x, y) => {
    const o = (clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)) * 4;
    return [px[o], px[o + 1], px[o + 2]];
  };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const corners = [
    [0, 0, 1, 1],
    [w - 1, 0, -1, 1],
    [0, h - 1, 1, -1],
    [w - 1, h - 1, -1, -1],
  ];
  const diag = corners.map(([x0, y0, dx, dy]) => {
    const bg = col(x0, y0);
    for (let k = 1; k < 40; k++) if (dist(col(x0 + dx * k, y0 + dy * k), bg) > 70) return k;
    return 0;
  });
  // straight sides: how far in the first strong change sits, at the middle of each side
  const side = (x0, y0, dx, dy) => {
    let total = 0;
    for (let s = -20; s <= 20; s += 5) {
      const sx = x0 + (dy ? s : 0);
      const sy = y0 + (dx ? s : 0);
      const bg = col(sx, sy);
      let k = 0;
      for (k = 1; k < 12; k++) if (dist(col(sx + dx * k, sy + dy * k), bg) > 70) break;
      total += k >= 12 ? 0 : k;
    }
    return total / 9;
  };
  const inset = {
    l: side(0, h >> 1, 1, 0),
    r: side(w - 1, h >> 1, -1, 0),
    t: side(w >> 1, 0, 0, 1),
    b: side(w >> 1, h - 1, 0, -1),
  };
  // a rounded corner of radius r (inset i) crosses the diagonal at i + r(1 - 1/sqrt2) from the
  // corner, in each axis
  const ins = (inset.l + inset.r + inset.t + inset.b) / 4;
  const radii = diag.map((d) => Math.max(0, (d - ins) / (1 - Math.SQRT1_2)));
  radii.sort((a, b) => a - b);
  return { inset, radius: (radii[1] + radii[2]) / 2, diag };
}

export function detectZones(px, w, h) {
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
  const { H, V } = lineMaps(boxBlur(lum, w, h, 1, 1), w, h);
  const gV = (x, y) => V[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
  const gH = (x, y) => H[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];

  const outline = outerOutline(px, w, h);
  const thr = 0.32;

  // frame: the inner line of the border on each side, searched in the outer ~9% (sides) / 8%
  const sw = Math.round(w * 0.09);
  const sh = Math.round(h * 0.08);
  const left = traceSide((a, c) => gV(c, a), h, Math.round(outline.inset.l) + 3, sw, thr);
  const right = traceSide((a, c) => gV(w - 1 - c, a), h, Math.round(outline.inset.r) + 3, sw, thr);
  const top = traceSide((a, c) => gH(a, c), w, Math.round(outline.inset.t) + 3, sh, thr);
  const bottom = traceSide((a, c) => gH(a, h - 1 - c), w, Math.round(outline.inset.b) + 3, sh, thr);
  // The frame band at the top and bottom stops at the border's outer line: a header bar or a
  // footer (name, subtitle, crests) often sits inside the outer 8% too, and frame-only metal
  // must not foil over its type.
  const outerOnly = { innermost: false };
  const topBand = traceSide((a, c) => gH(a, c), w, Math.round(outline.inset.t) + 3, sh, thr, outerOnly);
  const bottomBand = traceSide((a, c) => gH(a, h - 1 - c), w, Math.round(outline.inset.b) + 3, sh, thr, outerOnly);

  // window, top: the header's lower line, if one runs across; window, bottom: the type bar's
  // upper line. Rows scored by how much of the width a horizontal line covers.
  const cover = (y, x0, x1) => {
    let c = 0;
    for (let x = x0; x < x1; x++) if (gH(x, y) > thr) c++;
    return c / (x1 - x0);
  };
  const cx0 = Math.round(w * 0.12);
  const cx1 = Math.round(w * 0.88);
  const rowCover = new Float32Array(h);
  for (let y = 0; y < h; y++) rowCover[y] = cover(y, cx0, cx1);

  // type bar: the topmost row in 36-66% of the height whose line covers most of the width
  let barY = -1;
  {
    const y0 = Math.round(h * 0.36);
    const y1 = Math.round(h * 0.66);
    let max = 0;
    for (let y = y0; y <= y1; y++) max = Math.max(max, rowCover[y]);
    if (max > 0.45) {
      for (let y = y0; y <= y1; y++) {
        if (rowCover[y] >= max * 0.75 && rowCover[y] >= rowCover[y - 1] && rowCover[y] >= rowCover[y + 1]) {
          barY = y;
          break;
        }
      }
    }
  }
  // header: the lowest row in the top 20% with a line across most of the width
  let headY = -1;
  {
    const y0 = Math.round(h * 0.025);
    const y1 = Math.round(h * 0.2);
    for (let y = y1; y >= y0; y--) {
      // a real header line runs out to both sides (a title's flourish only spans the middle)
      const sides = Math.min(cover(y, cx0, Math.round(w * 0.25)), cover(y, Math.round(w * 0.75), cx1));
      if (rowCover[y] > 0.6 && sides > 0.5 && rowCover[y] >= rowCover[y - 1] && rowCover[y] >= rowCover[y + 1]) {
        headY = y;
        break;
      }
    }
  }

  // the window's top and bottom lines, as whole lines near those rows (outermost = the one
  // closest to the art for the bar, which is searched from the window side)
  const traceRow = (y) => (y < 0 ? null : traceSide((a, c) => gH(a, c), w, y - 4, y + 4, thr, { a0: cx0, a1: cx1 }));
  const winBottom = traceRow(barY);
  const winTop = traceRow(headY);

  // rasterise the zones
  const frame = new Float32Array(n);
  const win = new Float32Array(n);
  const depth = new Float32Array(n);
  const fb = 2; // px of feather
  const taper = w * 0.16; // where a boundary line is missing, depth fades in over this distance
  const presAt = (side, a) => (side ? side.pres[clamp(a, 0, side.pres.length - 1)] : 0);
  // fall-backs where a side's frame line wasn't found: the outline plus a thin band
  const sideAt = (side, a, fallback) => {
    const p = side.pos[clamp(a, 0, side.pos.length - 1)];
    return Number.isNaN(p) ? fallback : p;
  };
  const topLimit = (x) => (winTop ? winTop.pos[x] : sideAt(top, x, outline.inset.t + 8));
  const bottomLimit = (x) => (winBottom ? winBottom.pos[x] : NaN);

  let winPx = 0;
  let presSum = 0;
  let presN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const l = sideAt(left, y, outline.inset.l + 8);
      const r = w - 1 - sideAt(right, y, outline.inset.r + 8);
      const t = sideAt(top, x, outline.inset.t + 8);
      const b = h - 1 - sideAt(bottom, x, outline.inset.b + 8);
      const tb = sideAt(topBand, x, outline.inset.t + 8);
      const bb = h - 1 - sideAt(bottomBand, x, outline.inset.b + 8);
      const dIn = Math.min(x - l, r - x, y - tb, bb - y);
      frame[i] = 1 - smooth(-fb, fb, dIn);

      const wt = topLimit(x);
      const wb = bottomLimit(x);
      if (Number.isNaN(wb)) continue;
      const dl = x - l;
      const dr = r - x;
      const dt = y - wt;
      const db = wb - y;
      const inside = Math.min(dl, dr, dt, db);
      const wv = smooth(-fb, fb, inside);
      win[i] = wv;
      if (wv <= 0) continue;
      winPx += wv;
      // depth: per boundary, full up to the line where it is painted, faded where it isn't
      const fade = (d, p) => 1 - (1 - p) * (1 - smooth(0, taper, d));
      depth[i] =
        wv *
        fade(dl, presAt(left, y)) *
        fade(dr, presAt(right, y)) *
        fade(dt, winTop ? presAt(winTop, x) : 0) *
        fade(db, presAt(winBottom, x));
    }
  }
  // how much of the window's outline is a real painted line
  if (winBottom) {
    let yTop = h;
    let yBot = 0;
    for (let x = cx0; x < cx1; x++) {
      yTop = Math.min(yTop, topLimit(x));
      yBot = Math.max(yBot, bottomLimit(x));
    }
    for (let y = Math.round(yTop); y <= Math.round(yBot); y++) {
      presSum += presAt(left, y) + presAt(right, y);
      presN += 2;
    }
    for (let x = cx0; x < cx1; x++) {
      // an open top (art running up into the header) isn't counted against the card: the
      // depth fades out towards it anyway
      presSum += presAt(winBottom, x) + (winTop ? presAt(winTop, x) : 0);
      presN += winTop ? 2 : 1;
    }
  }
  const confidence = presN ? presSum / presN : 0;

  // The mythic print stamp: just inside the frame's inner corner at the bottom left, on every
  // card the same way (measured from that card's own frame lines). If what is painted there is
  // much busier than the bottom-right corner, it goes there instead. Size: 'stampH' of the
  // card's height, stampAspect wide.
  const stampH = Math.round(h * 0.042);
  const stampW = Math.round(stampH * 2.67);
  const busy = (x0, y0) => {
    let s = 0;
    for (let y = y0; y < y0 + stampH; y++) for (let x = x0; x < x0 + stampW; x++) s += gH(x, y) + gV(x, y) + Math.max(0, lum[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)] - 0.45);
    return s / (stampW * stampH);
  };
  const spot = (sideLine, mirror) => {
    const yb = h - 1 - sideAt(bottom, mirror ? w - 40 : 40, outline.inset.b + 8) - 3;
    const y0 = Math.round(yb - stampH);
    const edgeX = sideAt(sideLine, y0 + (stampH >> 1), 8) + 4;
    const x0 = Math.round(mirror ? w - 1 - edgeX - stampW : edgeX);
    return { x0, y0, busy: busy(x0, y0) };
  };
  const sl = spot(left, false);
  const sr = spot(right, true);
  let st = sr.busy < sl.busy * 0.6 ? sr : sl;
  // If both corners are busy (a weakness row or a crest painted there), slide along the bottom:
  // the calmest spot just above the border's outer line or its inner one, corners preferred.
  if (st.busy > 0.3) {
    for (const line of [bottom, bottomBand]) {
      for (let x0 = Math.round(outline.inset.l) + 6; x0 + stampW < w - outline.inset.r - 6; x0 += 3) {
        const yb = h - 1 - sideAt(line, x0 + (stampW >> 1), outline.inset.b + 8) - 3;
        const y0 = Math.round(yb - stampH);
        const toCorner = Math.min(x0, w - x0 - stampW) / w;
        const b = busy(x0, y0);
        if (b * (1 + toCorner) < st.busy) st = { x0, y0, busy: b };
      }
    }
  }
  const stamp = [st.x0 / w, 1 - (st.y0 + stampH) / h, (st.x0 + stampW) / w, 1 - st.y0 / h];

  return {
    frame,
    window: win,
    depth: boxBlur(depth, w, h, 1, 1),
    info: {
      outline,
      stamp,
      stampBusy: [+sl.busy.toFixed(3), +sr.busy.toFixed(3)],
      barY,
      headY,
      confidence: Math.round(confidence * 100) / 100,
      found: { left: +left.found.toFixed(2), right: +right.found.toFixed(2), top: +top.found.toFixed(2), bottom: +bottom.found.toFixed(2) },
      windowShare: +(winPx / n).toFixed(3),
      sides: { left: left.pos, right: right.pos, top: top.pos, bottom: bottom.pos },
      winTop: winTop?.pos ?? null,
      winBottom: winBottom?.pos ?? null,
      winTopPres: winTop?.pres ?? null,
      winBottomPres: winBottom?.pres ?? null,
      leftPres: left.pres,
      rightPres: right.pres,
    },
  };
}
