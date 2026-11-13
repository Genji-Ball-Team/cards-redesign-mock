// Common: quick and plain. One snap of a turn, a soft puff of light and a faint ring that dies
// out well before the screen's edge.
export function flipCommon(f) {
  const { v, ease, KIND, color } = f;
  f.sound(0, "flip-common");
  f.turn(0, 0.32, ease.out3, { lift: 0.12, tip: 0.16 });
  f.env(0.22, 0.3, 0.3, 0.55, (e) => {
    v.glow += e * 0.4;
  });
  f.sting(0.3);
  f.burst(0.3, { kind: KIND.glow, count: 8, cone: 1, speed: [0.25, 0.7], life: [0.35, 0.6], size: [0.05, 0.09], colors: [f.hot(0.3)], spread: [0.6, 0.85, 0.02] });
  f.wave(0.28, 0.45, { amp: 0.2, reach: 0.65 });
  f.screen(0.27, 0.31, 0.31, 0.55, { bloom: 0.1 });
  f.end(0.55);
  void color;
}
