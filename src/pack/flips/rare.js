// Rare: a short wind-up, the turn, then a cool blue flash with a ring that runs off the screen,
// a light blue wash, sparks thrown across the table, and a sheen sweeping the face.
export function flipRare(f) {
  const { v, ease, KIND, color } = f;
  f.sound(0, "flip-rare");
  // wind-up: the card dips into the table a moment
  f.env(0, 0.1, 0.12, 0.3, (e) => {
    v.dz -= 0.05 * e;
    v.s -= 0.025 * e;
  });
  f.env(0, 0.12, 0.3, 0.5, (e) => {
    v.glow += 0.45 * e;
  });
  f.turn(0.12, 0.4, ease.inOut3, { lift: 0.2, tip: 0.24 });
  f.sting(0.42);
  f.env(0.36, 0.43, 0.48, 0.95, (e) => {
    v.glow += 1.15 * e;
  });
  f.tl.tween(0.4, 0.55, (k) => {
    v.ring = k;
    v.ringA += 0.9;
  }, ease.out2);
  f.flash(0.38, 0.42, 0.42, 0.7, 0.13, color);
  f.tl.tween(0.46, 0.46, (k) => {
    v.sheen = -2.0 + 4.0 * k;
    v.sheenA += 1;
  }, ease.inOut2);
  f.burst(0.42, { kind: KIND.glow, count: 18, cone: 1, speed: [0.5, 1.3], life: [0.5, 0.9], size: [0.05, 0.1], colors: [color, f.hot(0.4)], spread: [0.65, 0.9, 0.02] });
  f.burst(0.42, { kind: KIND.spark, count: 10, cone: 1, speed: [1.4, 2.4], life: [0.3, 0.55], size: [0.03, 0.05], colors: [f.hot(0.6)], spread: [0.5, 0.8, 0.02] });
  f.wave(0.4, 0.6, { amp: 0.75, reach: 1.7 });
  f.screen(0.38, 0.44, 0.48, 0.85, { flood: 0.2, rays: 0.18, bloom: 0.3, exposure: 0.08 });
  f.fling(0.42, { kind: KIND.spark, count: 26, cone: 1, speed: [5, 9], life: [0.45, 0.8], size: [0.035, 0.06], colors: [f.hot(0.5), color], spread: [0.5, 0.8, 0.02] });
  f.end(0.95);
}
