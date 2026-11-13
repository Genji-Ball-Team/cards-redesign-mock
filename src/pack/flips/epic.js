// Epic: the card trembles as it charges up purple, turns, and bursts: two rings run off the
// screen, a purple flood with a chromatic, wobbling front, rays across the frame, holographic
// shards thrown over the whole table, a small camera kick, and a sheen. Announcer 0.75 s after
// the sting.
const HOLO = [
  [0.75, 0.35, 1.0],
  [0.4, 0.75, 1.0],
  [1.0, 0.45, 0.85],
  [0.55, 1.0, 0.85],
  [1.0, 0.9, 1.0],
];

export function flipEpic(f) {
  const { v, ease, KIND, color } = f;
  f.sound(0, "flip-epic");
  // charge: rising glow, a little lift, a tremble that grows
  f.env(0, 0.25, 0.25, 0.75, (e, t) => {
    v.dz += 0.09 * e;
    if (t < 0.3) f.tremble(t, 0.012 * e);
  }, ease.in2);
  f.env(0, 0.25, 0.4, 0.6, (e) => {
    v.glow += 0.75 * e;
  }, ease.in2);
  f.turn(0.25, 0.45, ease.inOut3, { lift: 0.22, tip: 0.26 });
  f.sting(0.55);
  f.env(0.5, 0.56, 0.62, 1.25, (e) => {
    v.glow += 1.5 * e;
  });
  f.env(0.52, 0.62, 0.8, 1.3, (e) => {
    v.rays += 0.9 * e;
  });
  f.tl.tween(0.53, 0.6, (k) => {
    v.ring = k;
    v.ringA += 1.2;
  }, ease.out3);
  f.flash(0.5, 0.55, 0.55, 0.85, 0.2, color);
  f.tl.tween(0.62, 0.45, (k) => {
    v.sheen = -2.0 + 4.0 * k;
    v.sheenA += 1;
  }, ease.inOut2);
  f.burst(0.55, { kind: KIND.shard, count: 42, cone: 1, speed: [1.2, 2.7], life: [0.8, 1.35], size: [0.07, 0.13], colors: HOLO, spread: [0.55, 0.85, 0.02] });
  f.burst(0.55, { kind: KIND.glow, count: 16, cone: 1, speed: [0.5, 1.4], life: [0.6, 1.0], size: [0.06, 0.12], colors: [color, f.hot(0.5)], spread: [0.6, 0.9, 0.02] });
  // screen-wide
  f.screen(0.05, 0.5, 0.5, 0.6, { rays: 0.2, bloom: 0.15, vignette: 0.2, weight: 0.3 }, ease.in2);
  f.wave(0.53, 0.75, { amp: 1.0, reach: 2.3 });
  f.wave(0.64, 0.8, { amp: 0.5, reach: 2.1 });
  f.screen(0.5, 0.57, 0.72, 1.25, { flood: 0.6, rays: 0.85, bloom: 0.6, exposure: 0.22, chroma: 0.7, distort: 0.8, vignette: 0.25 });
  f.env(0.53, 0.55, 0.55, 0.85, (e) => {
    f.room.shake += 0.014 * e;
  });
  f.push(0.45, 0.56, 0.7, 1.2, 0.45);
  f.fling(0.55, { kind: KIND.shard, count: 80, cone: 1, speed: [4, 12], life: [0.9, 1.5], size: [0.08, 0.15], colors: HOLO, spread: [0.5, 0.8, 0.02] });
  f.fling(0.56, { kind: KIND.glow, count: 22, cone: 1, speed: [3, 8], life: [0.6, 1.0], size: [0.08, 0.14], colors: [color, f.hot(0.5)], spread: [0.5, 0.8, 0.02] });
  f.end(1.3);
}
