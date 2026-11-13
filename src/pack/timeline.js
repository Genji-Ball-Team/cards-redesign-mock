// A small timeline: tweens and cues on one clock, evaluated as a pure function of time, so a
// sequence can be played, scrubbed or frozen at an exact moment (the shots script does that).
//
//   const tl = new Timeline();
//   tl.set(0, () => ...)                        // state at the start (an instant tween)
//   tl.tween(0.2, 0.5, (k) => ..., ease.out3)   // k: 0..1 from 0.2 s to 0.7 s
//   tl.cue(0.55, (at) => ...)                   // once, when the clock passes 0.55 s
//   tl.play(clock) / tl.update(clock)           // driven by any clock (seconds)
//   tl.seek(t)                                  // jump: cues up to t fire in order
//
// Each update re-evaluates every tween that has started, in start order, so a later tween wins
// where two drive the same value. Values a tween owns before it starts must be set at time 0.
// A cue gets its scheduled time on the outer clock (start + at), so effects spawned from it
// (particles) are placed exactly even when the cue fires late or during a seek.

export const ease = {
  linear: (x) => x,
  in2: (x) => x * x,
  in3: (x) => x * x * x,
  out2: (x) => 1 - (1 - x) * (1 - x),
  out3: (x) => 1 - (1 - x) ** 3,
  out4: (x) => 1 - (1 - x) ** 4,
  inOut2: (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
  inOut3: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2),
  // overshoots then settles: for landings
  outBack: (x, s = 1.6) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  // springy settle
  outElastic: (x) => (x === 0 || x === 1 ? x : 2 ** (-9 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3.2)) + 1),
};

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
// 0 -> 1 -> 0 over [a, b] with soft shoulders: for flashes and pulses
export const bump = (t, a, peak, b) => (t <= a || t >= b ? 0 : t < peak ? ease.out2((t - a) / (peak - a)) : 1 - ease.in2((t - peak) / (b - peak)));
// deterministic tremble, so a frozen frame shows the same shake every time
export const shake = (t, f = 31) => Math.sin(t * f) * 0.6 + Math.sin(t * f * 1.73 + 1.3) * 0.4;

export class Timeline {
  constructor() {
    this.tweens = [];
    this.cues = [];
    this.start = 0;
    this.time = 0;
    this.duration = 0;
    this.playing = false;
    this.cueIndex = 0;
    this.onEnd = null;
  }

  set(at, fn) {
    return this.tween(at, 0, () => fn());
  }

  tween(at, dur, fn, easing = ease.linear) {
    this.tweens.push({ at, dur, fn, easing, order: this.tweens.length });
    this.duration = Math.max(this.duration, at + dur);
    return this;
  }

  cue(at, fn) {
    this.cues.push({ at, fn });
    this.duration = Math.max(this.duration, at);
    return this;
  }

  // freeze the order once, before the first update
  sort() {
    this.tweens.sort((a, b) => a.at - b.at || a.order - b.order);
    this.cues.sort((a, b) => a.at - b.at);
  }

  play(clock) {
    this.sort();
    this.start = clock;
    this.playing = true;
    this.cueIndex = 0;
    this.time = 0;
    this.evaluate(0);
    this.fireCues(0);
    return this;
  }

  // Starts the timeline so that `t` seconds of it have already passed at `clock`: cues up to t
  // fire (in order) and the tweens show time t. Used to freeze a frame for screenshots.
  seek(clock, t) {
    this.sort();
    this.start = clock - t;
    this.playing = true;
    this.cueIndex = 0;
    this.time = t;
    this.fireCues(t);
    this.evaluate(t);
    return this;
  }

  update(clock) {
    if (!this.playing) return false;
    const t = clock - this.start;
    this.time = t;
    this.fireCues(t);
    this.evaluate(t);
    if (t >= this.duration) {
      this.playing = false;
      this.onEnd?.();
    }
    return true;
  }

  fireCues(t) {
    while (this.cueIndex < this.cues.length && this.cues[this.cueIndex].at <= t) {
      const c = this.cues[this.cueIndex++];
      c.fn(this.start + c.at);
    }
  }

  evaluate(t) {
    for (const tw of this.tweens) {
      if (tw.at > t) break;
      const k = tw.dur <= 0 ? 1 : clamp01((t - tw.at) / tw.dur);
      tw.fn(tw.easing(k));
    }
  }

  stop() {
    this.playing = false;
  }
}
