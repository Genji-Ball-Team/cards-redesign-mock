import { Timeline, ease, bump, shake } from "../timeline.js";
import { KIND } from "../particles.js";
import { screenKit } from "../screenFx.js";
import { flipCommon } from "./common.js";
import { flipRare } from "./rare.js";
import { flipEpic } from "./epic.js";
import { flipLegendary } from "./legendary.js";
import { flipMythic } from "./mythic.js";

// Each rarity's flip is a timeline built by its own module, outranking the one below:
//
//   common     0.5 s  quick plain turn, a soft puff
//   rare       0.95 s wind-up, turn, cool blue flash + ring, a sheen sweeps the face
//   epic       1.3 s  trembling charge, turn, purple ring, holo shards, rays (announcer +0.75 s)
//   legendary  2.2 s  held beat with gold light breaking out of the back, camera push, turn,
//                     gold burst + sparks, camera back (announcer +1.0 s)
//   mythic     3.8 s  the room goes dark, red light and embers, two heartbeats, a slow heavy
//                     turn, screen shake, the print number stamped on, light returns
//                     (announcer +1.05 s)
//
// "short" versions (a lesser card turned after the pack's best is already face up) skip the
// held beats, the camera and the announcer; reduced motion gets one calm 0.3 s turn for all.
//
// From rare up the reveal fills the screen from the card (screenFx.js and scene/post.js): a light
// ring running out past the edges, rays, a colour flood, particles thrown across the whole
// frame, the room's lights turning to the rarity colour and the other cards rocked by the wave.
// It scales up the ladder: common stays a small ring, mythic owns the screen.
//
// A flip writes two kinds of state:
//   - the slot's yaw (persistent: it ends face up) and, for mythics, the print stamp
//   - transient effects in slot.v and room (glow, lift, shake, flash, ...), which the reveal
//     resets every frame before the timelines add theirs, so every effect must end at zero.

export const FLIPS = {
  common: flipCommon,
  rare: flipRare,
  epic: flipEpic,
  legendary: flipLegendary,
  mythic: flipMythic,
};

// Gap between the reveal sting and the announcer, so they don't talk over each other.
export const ANNOUNCE_GAP = { epic: 0.75, legendary: 1.0, mythic: 1.05 };

// Envelope: rises a->b, holds b->c, falls c->d. Written as one tween over a..d.
export function env(tl, a, b, c, d, fn, up = ease.out2, down = ease.inOut2) {
  tl.tween(a, d - a, (k) => {
    const t = a + k * (d - a);
    let e = 0;
    if (t < b) e = up((t - a) / Math.max(1e-4, b - a));
    else if (t <= c) e = 1;
    else e = 1 - down((t - c) / Math.max(1e-4, d - c));
    fn(e, t);
  });
}

// Builds the flip for one slot. ctx: { slot, room, particles, audio, reduced, full, onReveal,
// view } (view(): the visible world rectangle at the table, { cx, cy, hw, hh })
export function buildFlip(ctx) {
  const tl = new Timeline();
  const f = makeFlipKit(tl, ctx);
  if (ctx.reduced) calmFlip(f);
  else FLIPS[ctx.slot.rarity.id](f);
  return tl;
}

function makeFlipKit(tl, ctx) {
  const { slot, room, particles, audio } = ctx;
  const v = slot.v;
  const c = slot.rarity.linear;
  const sk = screenKit(tl, room, () => slot.root.position, c, slot.i * 1.7 + 0.3);
  const f = {
    tl,
    v,
    room,
    slot,
    full: ctx.full,
    color: c,
    audio,
    ease,
    bump,
    shake,
    KIND,
    // the rarity colour mixed towards white
    hot: (k = 0.5, col = c) => [col[0] + (1 - col[0]) * k, col[1] + (1 - col[1]) * k, col[2] + (1 - col[2]) * k],
    env: (...a) => env(tl, ...a),
    // the turn itself: face down (yaw PI) to face up (2 PI), lifting off the table on the way
    turn(at, dur, easing = ease.inOut3, { lift = 0.16, tip = 0.22 } = {}) {
      tl.set(0, () => {
        slot.yaw = Math.PI;
      });
      tl.tween(at, dur, (k) => {
        slot.yaw = Math.PI + Math.PI * k;
        const s = Math.sin(Math.PI * k);
        v.dz += lift * s;
        v.pitch -= tip * s;
      }, easing);
      tl.tween(at + dur, 0, () => {
        slot.yaw = 0;
      });
    },
    // the moment the face is up: sting now, announcer after a gap (full shows, epic and up)
    sting(at) {
      tl.revealAt = at;
      tl.cue(at, () => {
        audio.play(`sting-${slot.rarity.id}`);
        ctx.onReveal?.(slot);
      });
      const gap = ANNOUNCE_GAP[slot.rarity.id];
      if (gap && ctx.full) tl.cue(at + gap, () => audio.play(`announce-${slot.rarity.id}`));
    },
    sound(at, name) {
      tl.cue(at, () => audio.play(name));
    },
    // particles from the card (offset in world units from its centre)
    burst(at, opts, off = [0, 0, 0]) {
      tl.cue(at, (time) => {
        const p = slot.root.position;
        particles.burst({ seed: slot.i + 1, ...opts, at: time, origin: { x: p.x + off[0], y: p.y + off[1], z: p.z + off[2] + 0.05 } });
      });
    },
    // screen-wide: the post pass and the room (see screenFx.js)
    screen: sk.screen,
    wave: sk.wave,
    // particles thrown from the card across the whole screen: little drag, mostly in the
    // card's plane so they fly over the other cards rather than at the lens
    fling(at, opts, off) {
      f.burst(at, { drag: 0.16, gravity: 0.3, flat: 0.35, ...opts }, off);
    },
    // particles over the whole visible table at once (embers everywhere)
    everywhere(at, dur, opts) {
      tl.cue(at, (time) => {
        const e = ctx.view();
        particles.stream({ seed: slot.i + 11, ...opts, t0: time, t1: time + dur, origin: { x: e.cx, y: e.cy - e.hh * 0.2, z: 0.4 }, spread: [e.hw * 1.05, e.hh * 0.95, 0.5] });
      });
    },
    stream(at, dur, opts, off = [0, 0, 0]) {
      tl.cue(at, (time) => {
        const p = slot.root.position;
        particles.stream({ seed: slot.i + 7, ...opts, t0: time, t1: time + dur, origin: { x: p.x + off[0], y: p.y + off[1], z: p.z + off[2] } });
      });
    },
    tremble(t, amp, freq = 61) {
      v.dx += shake(t, freq) * amp;
      v.dy += shake(t + 3.1, freq * 0.87) * amp * 0.6;
      v.rz += shake(t + 7.7, freq * 0.71) * amp * 0.9;
    },
    flash(a, b, c, d, amount, col = c) {
      env(tl, a, b, c, d, (e) => {
        room.flash = Math.max(room.flash, e * amount);
        room.flashCol = col;
      });
    },
    push(a, b, c, d, amount) {
      env(tl, a, b, c, d, (e) => {
        if (e * amount > room.push) {
          room.push = e * amount;
          room.pushX = slot.root.position.x;
          room.pushY = slot.root.position.y;
        }
      }, ease.inOut2, ease.inOut2);
    },
    stampOn(at) {
      const u = slot.card.mats.card.uStampOn;
      tl.set(0, () => {
        u.value = 0;
      });
      tl.tween(at, 0, () => {
        u.value = 1;
      });
    },
    end(at) {
      tl.tween(at, 0, () => {});
    },
  };
  return f;
}

// Reduced motion: one calm turn for every rarity, the colour and the sound still tell them apart.
function calmFlip(f) {
  const { tl, v, slot } = f;
  f.sound(0, `flip-${slot.rarity.id}`);
  f.turn(0, 0.3, ease.inOut2, { lift: 0, tip: 0 });
  f.env(0, 0.25, 0.3, 0.7, (e) => {
    v.glow += e * (0.4 + slot.rarity.index * 0.15);
  });
  if (slot.rarity.id === "mythic") f.stampOn(0.3);
  f.sting(0.3);
  f.end(0.7);
  return tl;
}
