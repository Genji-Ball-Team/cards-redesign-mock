import { CARD_W, CARD_H } from "../card/geometry.js";

// Where the five cards land. Several arrangements are tried and the one that gives the biggest
// cards in the box wins: on a phone that's 2-1-2 (three rows), on a desktop one gently arched
// row, in between 3 over 2. The fifth card dealt goes in the middle; the deal is shuffled
// (pulls.js), so the middle says nothing about the rarity.
//
// Returns { kind, slots: [{ x, y, rz }] (in pull order), fitW, fitH, obj } in world units.

const GAP = 0.16;
const MARGIN = 0.34; // room for the hover lift and glow round the edge

function row5() {
  const step = CARD_W + 0.22;
  // positions left to right; the fifth card goes in the centre
  const order = [0, 1, 3, 4, 2];
  const slots = order.map((p) => {
    const k = p - 2;
    return { x: k * step, y: 0.16 - 0.06 * k * k, rz: -k * 0.035 };
  });
  return { kind: "row", slots, fitW: 5 * CARD_W + 4 * 0.22 + MARGIN, fitH: CARD_H + 0.4 + MARGIN, obj: CARD_H * 1.25 };
}

function rows212() {
  const dx = (CARD_W + GAP) / 2;
  const dy = CARD_H + GAP;
  const slots = [
    { x: -dx, y: dy, rz: 0.012 },
    { x: dx, y: dy, rz: -0.012 },
    { x: -dx, y: -dy, rz: -0.012 },
    { x: dx, y: -dy, rz: 0.012 },
    { x: 0, y: 0, rz: 0 },
  ];
  return { kind: "212", slots, fitW: 2 * CARD_W + GAP + MARGIN, fitH: 3 * CARD_H + 2 * GAP + MARGIN, obj: CARD_H * 2.3 };
}

function rows32() {
  const step = CARD_W + GAP;
  const dy = (CARD_H + GAP) / 2;
  const slots = [
    { x: -step, y: dy, rz: 0.02 },
    { x: step, y: dy, rz: -0.02 },
    { x: -step / 2, y: -dy, rz: 0.01 },
    { x: step / 2, y: -dy, rz: -0.01 },
    { x: 0, y: dy + 0.05, rz: 0 },
  ];
  return { kind: "32", slots, fitW: 3 * CARD_W + 2 * GAP + MARGIN, fitH: 2 * CARD_H + GAP + 0.05 + MARGIN, obj: CARD_H * 1.6 };
}

export function spreadLayout(boxW, boxH) {
  let best = null;
  for (const make of [row5, rows32, rows212]) {
    const l = make();
    const wpp = Math.max(l.fitW / boxW, l.fitH / boxH);
    if (!best || wpp < best.wpp) best = { ...l, wpp };
  }
  return best;
}
