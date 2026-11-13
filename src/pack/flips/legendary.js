// Legendary: a held beat. The room darkens, the card rises, gold light breaks out of the cracks
// in its back and gold rays reach across the screen while the camera pushes in; then it turns
// and floods the whole screen gold: two rings, rays, sparks thrown across the table, a lift in
// exposure. The camera settles back. Short version: no beat, no camera, a smaller wave.
const GOLD = [1.0, 0.78, 0.32];
const GOLDS = [
  [1.0, 0.82, 0.4],
  [1.0, 0.66, 0.22],
  [1.0, 0.93, 0.7],
];

export function flipLegendary(f) {
  const { v, ease, KIND, room } = f;
  f.sound(0, "flip-legendary");
  if (!f.full) {
    f.env(0, 0.2, 0.2, 0.45, (e) => {
      v.leak += 0.6 * e;
      v.glow += 0.6 * e;
    });
    f.turn(0.2, 0.4, ease.inOut3, { lift: 0.2 });
    f.sting(0.5);
    f.env(0.45, 0.52, 0.6, 1.1, (e) => {
      v.glow += 1.4 * e;
      v.rays += 0.6 * e;
    });
    f.tl.tween(0.48, 0.55, (k) => {
      v.ring = k;
      v.ringA += 1.1;
    }, ease.out3);
    f.flash(0.46, 0.5, 0.5, 0.8, 0.15, GOLD);
    f.burst(0.5, { kind: KIND.spark, count: 40, cone: 1, speed: [1.8, 3.6], life: [0.5, 1.0], size: [0.035, 0.06], colors: GOLDS, spread: [0.55, 0.85, 0.02] });
    f.wave(0.48, 0.65, { amp: 0.85, reach: 1.9 });
    f.screen(0.46, 0.52, 0.6, 1.05, { flood: 0.38, rays: 0.45, bloom: 0.45, exposure: 0.15, distort: 0.4 });
    f.fling(0.5, { kind: KIND.spark, count: 30, cone: 1, speed: [5, 10], life: [0.5, 0.9], size: [0.035, 0.06], colors: GOLDS, spread: [0.5, 0.8, 0.02] });
    f.tl.tween(0.58, 0.45, (k) => {
      v.sheen = -2.0 + 4.0 * k;
      v.sheenA += 1;
    }, ease.inOut2);
    f.end(1.1);
    return;
  }

  // the beat: up off the table, light breaking out
  f.env(0, 0.35, 1.3, 2.0, (e) => {
    v.dz += 0.3 * e;
    v.s += 0.05 * e;
  }, ease.out3);
  f.env(0.1, 0.68, 0.7, 0.95, (e) => {
    v.leak += e;
  }, ease.in2);
  f.env(0, 0.7, 0.72, 1.0, (e) => {
    v.glow += 0.8 * e;
  }, ease.in2);
  f.env(0.2, 0.7, 0.72, 1.0, (e) => {
    v.rays += 0.55 * e;
  }, ease.in2);
  f.env(0.35, 0.7, 0.7, 0.76, (e, t) => {
    f.tremble(t, 0.009 * e, 73);
  }, ease.in2);
  f.env(0, 0.6, 1.0, 1.8, (e) => {
    room.dim += 0.32 * e;
  });
  f.push(0.2, 0.7, 1.6, 2.2, 1);
  // the beat on screen: the room darkens round the card, gold rays reach out across it
  f.screen(0.05, 0.7, 0.95, 1.05, { dark: 0.45, vignette: 0.45, weight: 0.4 }, ease.out2, ease.in2);
  f.screen(0.2, 0.92, 0.95, 1.0, { rays: 0.5, bloom: 0.2, weight: 0.5 }, ease.in2);
  // the turn
  f.turn(0.7, 0.45, ease.inOut3, { lift: 0.16, tip: 0.2 });
  f.sting(1.0);
  f.env(0.96, 1.03, 1.15, 2.1, (e) => {
    v.glow += 1.9 * e;
  });
  f.env(0.96, 1.08, 1.5, 2.2, (e) => {
    v.rays += 1.25 * e;
  });
  f.tl.tween(0.98, 0.75, (k) => {
    v.ring = k;
    v.ringA += 1.4;
  }, ease.out3);
  f.flash(0.97, 1.01, 1.01, 1.4, 0.28, GOLD);
  f.env(0.95, 1.05, 1.3, 2.0, (e) => {
    room.glow += 0.6 * e;
    room.glowCol = GOLD;
  });
  f.burst(1.0, { kind: KIND.spark, count: 75, cone: 1, speed: [2.0, 4.6], life: [0.6, 1.25], size: [0.035, 0.065], colors: GOLDS, spread: [0.55, 0.85, 0.02] });
  f.burst(1.0, { kind: KIND.glow, count: 30, cone: 1, speed: [0.5, 1.5], life: [0.8, 1.4], size: [0.06, 0.12], colors: GOLDS, spread: [0.6, 0.9, 0.02] });
  // the flood: rings off the screen, gold everywhere, then it clears for the card
  f.wave(0.98, 0.9, { amp: 1.3, reach: 2.7 });
  f.wave(1.1, 1.0, { amp: 0.6, reach: 2.4 });
  f.screen(0.97, 1.04, 1.3, 1.95, { flood: 0.85, rays: 1.1, bloom: 0.9, exposure: 0.4, chroma: 0.3, distort: 0.8, vignette: 0.3 });
  f.env(0.99, 1.01, 1.01, 1.35, (e) => {
    room.shake += 0.022 * e;
  });
  f.fling(1.0, { kind: KIND.spark, count: 100, cone: 1, speed: [6, 14], life: [0.6, 1.2], size: [0.04, 0.07], colors: GOLDS, spread: [0.5, 0.8, 0.02] });
  f.fling(1.02, { kind: KIND.glow, count: 34, cone: 1, speed: [3, 9], life: [0.8, 1.4], size: [0.08, 0.15], colors: GOLDS, spread: [0.5, 0.8, 0.02] });
  f.tl.tween(1.1, 0.5, (k) => {
    v.sheen = -2.0 + 4.0 * k;
    v.sheenA += 1.2;
  }, ease.inOut2);
  f.end(2.2);
}
