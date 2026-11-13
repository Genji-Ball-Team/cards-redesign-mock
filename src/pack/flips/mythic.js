// Mythic: the whole screen goes dark but for the card, embers rise off it, two heartbeats pulse
// red through the dark, then a slow, heavy turn lands with a shake and the screen erupts red:
// rings, rays, a chromatic wobble, embers everywhere, the longest aftermath. The print number is
// stamped on and the lights come back. Short version: a brief dimming, a turn, a red wave and
// the stamp.
import { CARD_H, CARD_W } from "../../card/geometry.js";

const EMBERS = [
  [1.0, 0.35, 0.08],
  [1.0, 0.55, 0.15],
  [0.9, 0.16, 0.05],
];
const HOT = [1.0, 0.45, 0.25];

export function flipMythic(f) {
  const { v, ease, KIND, room, color, slot } = f;
  f.sound(0, "flip-mythic");
  const stampXY = () => {
    const r = slot.stampRect;
    return [((r[0] + r[2]) / 2 - 0.5) * CARD_W, ((r[1] + r[3]) / 2 - 0.5) * CARD_H, 0.05];
  };
  const stamp = (at) => {
    // the plate slams down onto the number, then the foil is there
    f.env(at - 0.18, at, at + 0.04, at + 0.45, (e, t) => {
      v.stampA += e;
      v.stampScale = t < at ? 1 + 1.6 * (1 - e) : 1 + 0.15 * (1 - e);
    }, ease.in3);
    f.stampOn(at);
    f.env(at, at + 0.02, at + 0.02, at + 0.16, (e) => {
      v.dz -= 0.05 * e;
      room.shake += 0.012 * e;
    });
    f.burst(at, { kind: KIND.spark, count: 22, cone: 1, speed: [1.0, 2.2], life: [0.3, 0.6], size: [0.03, 0.05], colors: [HOT, [1, 0.85, 0.6]], spread: [0.15, 0.04, 0.01] }, stampXY());
  };

  if (!f.full) {
    f.env(0, 0.25, 0.8, 1.4, (e) => {
      room.dim += 0.5 * e;
      room.red += 0.6 * e;
    });
    f.env(0, 0.25, 0.3, 0.6, (e) => {
      v.glow += 0.7 * e;
      v.leak += 0.6 * e;
    });
    f.turn(0.25, 0.5, ease.inOut3, { lift: 0.2 });
    f.sting(0.62);
    f.env(0.58, 0.65, 0.8, 1.4, (e) => {
      v.glow += 1.6 * e;
      v.rays += 0.7 * e;
    });
    f.flash(0.6, 0.64, 0.64, 0.95, 0.22, HOT);
    f.burst(0.62, { kind: KIND.ember, count: 40, cone: 1, speed: [0.6, 1.8], life: [0.9, 1.6], size: [0.04, 0.07], colors: EMBERS, spread: [0.6, 0.9, 0.02] });
    f.screen(0, 0.25, 0.55, 0.66, { dark: 0.45, vignette: 0.3, weight: 0.4 });
    f.wave(0.6, 0.75, { amp: 1.0, reach: 2.2 });
    f.screen(0.6, 0.66, 0.8, 1.3, { flood: 0.5, rays: 0.5, bloom: 0.6, exposure: 0.2, chroma: 0.4, distort: 0.6 });
    f.fling(0.62, { kind: KIND.ember, count: 50, cone: 1, speed: [3, 8], life: [0.9, 1.5], size: [0.05, 0.08], colors: EMBERS, spread: [0.5, 0.8, 0.02] });
    stamp(0.85);
    f.end(1.45);
    return;
  }

  // lights down, red up
  f.env(0, 0.6, 3.0, 3.8, (e) => {
    room.dim += 0.86 * e;
  }, ease.out2, ease.inOut2);
  f.env(0.1, 0.7, 3.0, 3.8, (e) => {
    room.red += e;
  });
  // the card smoulders, embers rise off it the whole time
  f.env(0.15, 0.6, 1.4, 1.55, (e) => {
    v.glow += 0.45 * e;
  });
  f.stream(0.1, 3.0, { kind: KIND.ember, rate: 34, dir: [0, 1, 0], cone: 0.55, speed: [0.15, 0.55], life: [1.4, 2.4], size: [0.035, 0.065], colors: EMBERS, spread: [0.7, 0.1, 0.15] }, [0, -0.9, 0]);
  // the screen goes dark but for the card, until the impact
  f.screen(0, 0.6, 2.3, 2.37, { dark: 0.88, vignette: 0.55, weight: 0.3 }, ease.out2, ease.linear);
  // two heartbeats
  for (const at of [0.7, 1.1]) {
    f.screen(at, at + 0.06, at + 0.06, at + 0.4, { flood: 0.3, chroma: 0.25, bloom: 0.2, weight: 0.5 });
    f.env(at, at + 0.06, at + 0.06, at + 0.36, (e) => {
      v.s += 0.035 * e;
      v.glow += 0.75 * e;
      room.shake += 0.004 * e;
      room.glow += 0.25 * e;
      room.glowCol = color;
    });
  }
  // rising, cracks of red light through the back, a tremble
  f.env(1.0, 1.5, 2.7, 3.5, (e) => {
    v.dz += 0.32 * e;
    v.s += 0.05 * e;
  }, ease.out3);
  f.env(0.9, 1.45, 1.6, 1.95, (e) => {
    v.leak += e;
  }, ease.in2);
  f.env(1.2, 1.5, 1.5, 1.65, (e, t) => {
    f.tremble(t, 0.01 * e, 67);
  }, ease.in2);
  f.push(1.2, 2.0, 3.0, 3.8, 0.7);
  // the slow heavy turn
  f.turn(1.5, 0.9, ease.inOut3, { lift: 0.18, tip: 0.3 });
  f.sting(2.35);
  // impact
  f.env(2.3, 2.33, 2.33, 2.75, (e) => {
    room.shake += 0.045 * e;
  });
  f.flash(2.32, 2.36, 2.36, 2.85, 0.42, HOT);
  f.env(2.33, 2.4, 2.6, 3.6, (e) => {
    v.glow += 2.0 * e;
  });
  f.env(2.35, 2.45, 3.0, 3.8, (e) => {
    v.rays += 1.2 * e;
  });
  f.env(2.33, 2.45, 2.9, 3.7, (e) => {
    room.glow += 0.8 * e;
    room.glowCol = color;
  });
  f.tl.tween(2.35, 0.8, (k) => {
    v.ring = k;
    v.ringA += 1.5;
  }, ease.out3);
  f.burst(2.35, { kind: KIND.ember, count: 70, cone: 1, speed: [0.8, 2.3], life: [1.0, 2.0], size: [0.04, 0.075], colors: EMBERS, spread: [0.6, 0.9, 0.02] });
  f.burst(2.35, { kind: KIND.spark, count: 60, cone: 1, speed: [2.0, 4.8], life: [0.5, 1.1], size: [0.035, 0.06], colors: [HOT, [1, 0.75, 0.35], [1, 0.95, 0.85]], spread: [0.55, 0.85, 0.02] });
  // eruption: the screen floods red, rings run off it, embers everywhere, a long aftermath
  f.wave(2.33, 1.1, { amp: 1.6, reach: 3.0 });
  f.wave(2.47, 1.2, { amp: 0.8, reach: 2.8 });
  f.wave(2.78, 0.6, { amp: 0.5, reach: 1.4 });
  f.screen(2.32, 2.4, 2.7, 3.8, { flood: 0.9, rays: 1.1, bloom: 0.95, exposure: 0.32, chroma: 0.9, distort: 1.1, vignette: 0.35 }, ease.out2, ease.out2);
  f.fling(2.35, { kind: KIND.spark, count: 90, cone: 1, speed: [7, 16], life: [0.5, 1.0], size: [0.04, 0.07], colors: [HOT, [1, 0.75, 0.35], [1, 0.95, 0.85]], spread: [0.5, 0.8, 0.02] });
  f.fling(2.36, { kind: KIND.ember, count: 90, cone: 1, speed: [3, 10], life: [1.2, 2.2], size: [0.05, 0.09], colors: EMBERS, spread: [0.5, 0.8, 0.02] });
  f.everywhere(2.33, 1.4, { kind: KIND.ember, rate: 150, dir: [0, 1, 0], cone: 0.6, speed: [0.2, 0.9], life: [1.0, 2.0], size: [0.05, 0.09], colors: EMBERS });
  stamp(2.78);
  f.tl.tween(2.95, 0.5, (k) => {
    v.sheen = -2.0 + 4.0 * k;
    v.sheenA += 1;
  }, ease.inOut2);
  f.end(3.8);
}
