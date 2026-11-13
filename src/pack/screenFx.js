import { ease } from "./timeline.js";

// Screen-wide effects for the big moments (the pack's burst and the reveals), written into the
// room for the post pass (scene/post.js) and the room's lights. Everything starts at a point in
// the world (the card being turned, the pack's mouth): `src()` gives it each frame, so a card
// that moves keeps the effect on it. When several run at once the strongest this frame owns the
// origin and the colour; amounts take the maximum.
//
//   screen(a, b, c, d, { rays, flood, dark, bloom, exposure, vignette, chroma, distort })
//            an envelope: rises a->b, holds b->c, falls c->d
//   wave(at, dur, { amp, reach })
//            a light ring from the origin out to `reach` screen heights (past the edges at ~1),
//            fading as it goes; the colour flood follows its front

const KEYS = ["rays", "flood", "dark", "bloom", "exposure", "vignette", "chroma", "distort"];

export function screenKit(tl, room, src, col, seed = 0) {
  const aim = (w) => {
    if (w < room.ow) return;
    const p = src();
    room.ow = w;
    room.ox = p.x;
    room.oy = p.y;
    room.oz = p.z;
    room.col = col;
    room.seed = seed;
  };
  return {
    aim,
    screen(a, b, c, d, amt, up = ease.out2, down = ease.inOut2) {
      tl.tween(a, d - a, (k) => {
        const t = a + k * (d - a);
        let e;
        if (t < b) e = up((t - a) / Math.max(1e-4, b - a));
        else if (t <= c) e = 1;
        else e = 1 - down((t - c) / Math.max(1e-4, d - c));
        if (e <= 0) return;
        aim(e * (amt.weight ?? 1));
        for (const key of KEYS) if (amt[key]) room[key] = Math.max(room[key], e * amt[key]);
      });
    },
    wave(at, dur, { amp = 1, reach = 2.4 } = {}) {
      tl.tween(at, dur, (k) => {
        const R = reach * ease.out3(k);
        if (k <= 0 || k >= 1) return;
        const A = amp * (1 - k) ** 1.4 * Math.min(1, k * 12);
        aim(A + 0.01);
        if (A >= room.waveA) {
          room.wave = R;
          room.waveA = A;
        }
        room.floodR = Math.min(room.floodR, R + 0.1);
      });
    },
  };
}
