import { Timeline, ease, shake } from "./timeline.js";
import { KIND } from "./particles.js";
import { PACK_W, TEAR_Y } from "./packMesh.js";
import { screenKit } from "./screenFx.js";

// The pack's own choreography, on the shared timeline (see timeline.js):
//
// Opening, about 1.95 s
//   0.00-0.55  anticipation: the pack swells, trembles harder and harder, light gathers at the
//              tear line                                                    (tension)
//   0.55       the top seal tears off and flies away, foil fragments         (tear)
//   0.62       burst: flash and light out of the mouth, filling the screen: a ring past the
//              edges, rays and a wash in the pack's trim colour, foil thrown across the
//              whole frame, clearing by about 1.3 s                         (burst)
//   0.70-1.85  five cards fly out one after another, every 0.1 s, each on a 0.75 s arc,
//              spinning down into the spread, face down                     (whoosh, land)
//              the fifth card comes out last, into the middle (the deal is shuffled)
//   0.70-1.60  the camera pulls back from the pack to the spread
//   1.10-1.60  the empty pack drops away
//
// Collect ("Done"), about 0.95 s: the cards sweep down off the stage (collect), the camera
// comes back in, and a fresh pack drops onto the stage.
//
// Reduced motion: the pack fades, the cards appear in place, no shake and no particles.
//
// State written here: S.camMix (0 pack framing, 1 spread framing), S.packGone, and per slot
// arc (0 in the pack, 1 landed), shown and away; plus the pack's per-frame fx.

export const DEAL_ORDER = [0, 1, 2, 3, 4];
export const CARD_FLIGHT = 0.75;

export function buildOpening(S) {
  const tl = new Timeline();
  const { pack, slots, particles: P, audio, room } = S;
  const fx = pack.fx;
  const trim = pack.trim.toArray();
  const foil = pack.type.look.foil;

  tl.set(0, () => {
    S.packGone = false;
    S.camMix = 0;
    for (const s of slots) {
      s.arc = 0;
      s.shown = false;
      s.away = 0;
    }
  });

  if (S.reduced) {
    tl.tween(0, 0.3, (k) => {
      fx.fade = 1 - k;
    });
    tl.tween(0.3, 0, () => {
      S.packGone = true;
    });
    tl.tween(0, 0.45, (k) => {
      S.camMix = k;
    }, ease.inOut2);
    tl.cue(0.15, () => audio.play("burst"));
    slots.forEach((s, i) => {
      tl.tween(0.2 + i * 0.05, 0, () => {
        s.shown = true;
        s.arc = 1;
      });
    });
    tl.tween(0.5, 0, () => {});
    return tl;
  }

  // anticipation
  tl.cue(0, () => audio.play("tension"));
  tl.tween(0, 0.55, (k) => {
    const t = 0.55 * k;
    const amp = 0.022 * k * k;
    fx.scale = 1 + 0.06 * ease.out2(k);
    fx.shakeX = shake(t, 57) * amp;
    fx.shakeY = shake(t + 2, 49) * amp * 0.6;
    fx.shakeR = shake(t + 5, 41) * amp * 1.6;
    fx.gather = ease.in2(k);
  });

  // tear
  tl.cue(0.55, (at) => {
    audio.play("tear");
    const y = TEAR_Y * 1.06;
    P.burst({ kind: KIND.shard, count: 70, at, origin: { x: 0, y, z: 0.08 }, spread: [PACK_W * 0.5, 0.03, 0.06], dir: [0, 1, 0.3], cone: 0.75, speed: [1.0, 3.2], life: [0.8, 1.5], size: [0.06, 0.12], colors: [foil, trim, [1, 1, 1]], seed: 3 });
    P.burst({ kind: KIND.spark, count: 30, at, origin: { x: 0, y, z: 0.1 }, spread: [PACK_W * 0.5, 0.02, 0.02], dir: [0, 1, 0.2], cone: 0.6, speed: [2.0, 4.0], life: [0.35, 0.7], size: [0.03, 0.05], colors: [trim, [1, 1, 1]], seed: 5 });
  });
  tl.tween(0.55, 0.5, (k) => {
    fx.torn = 1;
    fx.scale = 1.06 + 0.03 * ease.out3(k);
    fx.shakeX = fx.shakeY = fx.shakeR = 0;
    fx.gather = 1 - ease.out2(k);
    fx.lift = 0.06 * ease.out3(k);
  });
  tl.tween(0.55, 0.65, (k) => {
    fx.capX = 0.5 * k;
    fx.capY = 1.6 * ease.out2(k) - 0.4 * k * k;
    fx.capRz = -0.9 * k;
    fx.capRx = -1.5 * k;
    fx.capFade = 1 - ease.in2(Math.max(0, (k - 0.45) / 0.55));
  });

  // burst
  tl.cue(0.62, (at) => {
    audio.play("burst");
    P.burst({ kind: KIND.glow, count: 44, at, origin: { x: 0, y: TEAR_Y, z: 0.05 }, spread: [PACK_W * 0.35, 0.02, 0.05], dir: [0, 1, 0.2], cone: 0.6, speed: [1.2, 3.0], life: [0.6, 1.2], size: [0.06, 0.13], colors: [trim, [1, 1, 1]], seed: 7 });
  });
  // screen-wide, from the pack's mouth
  const mouth = { x: 0, y: TEAR_Y * 0.98, z: 0.1 };
  const sk = screenKit(tl, room, () => mouth, trim, 2.1);
  sk.screen(0.4, 0.6, 0.6, 0.66, { rays: 0.3, bloom: 0.25, vignette: 0.25, weight: 0.4 }, ease.in2);
  sk.wave(0.6, 0.85, { amp: 1.15, reach: 2.5 });
  sk.wave(0.7, 0.9, { amp: 0.5, reach: 2.2 });
  sk.screen(0.58, 0.64, 0.74, 1.3, { flood: 0.45, rays: 0.8, bloom: 0.7, exposure: 0.3, chroma: 0.3, distort: 0.7, vignette: 0.2 });
  env(tl, 0.6, 0.62, 0.62, 0.9, (e) => {
    room.shake += 0.016 * e;
  });
  tl.cue(0.62, (at) => {
    const shardCols = [foil, trim, [1, 1, 1]];
    P.burst({ kind: KIND.shard, count: 90, at, origin: mouth, spread: [PACK_W * 0.4, 0.05, 0.05], dir: [0, 1, 0], cone: 1, flat: 0.35, drag: 0.16, gravity: 0.35, speed: [4, 12], life: [1.0, 1.6], size: [0.08, 0.15], colors: shardCols, seed: 13 });
    P.burst({ kind: KIND.spark, count: 50, at, origin: mouth, spread: [PACK_W * 0.4, 0.05, 0.05], dir: [0, 1, 0], cone: 1, flat: 0.35, drag: 0.2, gravity: 0.3, speed: [6, 14], life: [0.5, 0.9], size: [0.04, 0.07], colors: [trim, [1, 1, 1]], seed: 17 });
  });
  env(tl, 0.55, 0.62, 0.62, 0.95, (e) => {
    room.flash = Math.max(room.flash, 0.32 * e);
    room.flashCol = trim;
    room.glow += 0.8 * e;
    room.glowCol = trim;
  });

  // the cards fly out
  DEAL_ORDER.forEach((idx, n) => {
    const s = slots[idx];
    const at = 0.7 + n * 0.1;
    tl.tween(at, 0, () => {
      s.shown = true;
    });
    tl.tween(at, CARD_FLIGHT, (k) => {
      s.arc = k;
    });
    tl.cue(at, () => audio.play("card-whoosh", { rate: 0.9 + n * 0.055, gain: 0.85 + 0.03 * n }));
    tl.cue(at + CARD_FLIGHT, (time) => {
      audio.play("card-land", { rate: 0.96 + n * 0.02 });
      const p = S.slotTarget(idx);
      P.burst({ kind: KIND.glow, count: 10, at: time, origin: { x: p.x, y: p.y - 0.95, z: 0.05 }, spread: [0.6, 0.03, 0.05], dir: [0, 1, 0.3], cone: 0.9, speed: [0.2, 0.6], life: [0.4, 0.7], size: [0.04, 0.08], colors: [[0.75, 0.8, 0.85]], seed: 11 + n });
    });
  });

  // camera pulls back to the spread
  tl.tween(0.7, 0.9, (k) => {
    S.camMix = k;
  }, ease.inOut2);

  // the empty pack drops away
  tl.tween(1.1, 0.5, (k) => {
    fx.dropY = -3.4 * ease.in2(k);
    fx.dropR = 0.5 * k;
    fx.fade = 1 - ease.in2(Math.max(0, (k - 0.5) / 0.5));
  });
  tl.tween(1.6, 0, () => {
    S.packGone = true;
  });
  tl.tween(1.95, 0, () => {});
  return tl;
}

export function buildCollect(S) {
  const tl = new Timeline();
  const { pack, slots, audio } = S;
  const fx = pack.fx;
  tl.cue(0, () => audio.play("collect"));
  if (S.reduced) {
    tl.tween(0, 0, () => {
      for (const s of slots) s.shown = false;
      S.packGone = false;
      S.camMix = 0;
    });
    tl.tween(0, 0.3, (k) => {
      fx.fade = k;
    });
    return tl;
  }
  slots.forEach((s, i) => {
    tl.tween(i * 0.04, 0.45, (k) => {
      s.away = k;
    }, ease.in2);
  });
  tl.tween(0.5, 0, () => {
    for (const s of slots) s.shown = false;
  });
  tl.tween(0.15, 0.7, (k) => {
    S.camMix = 1 - k;
  }, ease.inOut2);
  tl.tween(0.35, 0, () => {
    S.packGone = false;
  });
  tl.tween(0.35, 0.6, (k) => {
    fx.dropY = 3.4 * (1 - ease.outBack(k, 1.2));
    fx.fade = Math.min(1, k * 3);
  });
  tl.tween(0.95, 0, () => {});
  return tl;
}

function env(tl, a, b, c, d, fn) {
  tl.tween(a, d - a, (k) => {
    const t = a + k * (d - a);
    const e = t < b ? ease.out2((t - a) / Math.max(1e-4, b - a)) : t <= c ? 1 : 1 - ease.inOut2((t - c) / Math.max(1e-4, d - c));
    fn(e);
  });
}
