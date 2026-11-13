import * as THREE from "three";
import { Card } from "../card/card.js";
import { CARD_W, CARD_H } from "../card/geometry.js";
import { rarityById } from "../data/cards.js";
import { createSlotFx, createVeil } from "./fx.js";
import { buildFlip } from "./flips/index.js";
import { ease, lerp } from "./timeline.js";
import { TEAR_Y } from "./packMesh.js";

// The five cards of a pack on the table: where they fly to, how they glow when pointed at, their
// flips, and the one brought forward to look at.
//
// Per slot:
//   root        position, scale, roll (the halo sits here and doesn't turn with the card)
//   card.group  pitch / yaw: the turn itself (sheen, leak and stamp ride on it)
//   v           this frame's transient effects, reset every frame, written by the flip timeline
//   yaw         persistent: PI face down, 0 face up
//   arc, shown, away   written by the opening / collect sequence

const PI = Math.PI;
// Face down, every card looks the same: the hover light is this neutral brand green for all of
// them, the edge is plain stock, nothing in motion, size or order differs. The rarity first shows
// when the flip starts (conceal(slot, false)).
const HOVER_COL = [0.32, 0.95, 0.62];

function restV() {
  return { dx: 0, dy: 0, dz: 0, s: 0, rz: 0, pitch: 0, glow: 0, rays: 0, ring: 0, ringA: 0, sheen: 9, sheenA: 0, leak: 0, stampA: 0, stampScale: 1 };
}

// The room's transient state, reset every frame. Besides the lights and the camera, the
// screen-wide reveal: where it starts (o*, world; ow: the strongest effect this frame owns it),
// its colour, and the post pass's amounts (see scene/post.js): wave (ring radius in screen
// heights) and waveA, rays, flood (and floodR, how far it has spread), dark, bloom, exposure,
// vignette, chroma, distort.
export function restRoom() {
  return {
    dim: 0, red: 0, push: 0, pushX: 0, pushY: 0, shake: 0, flash: 0, flashCol: [1, 1, 1], glow: 0, glowCol: [1, 1, 1],
    ox: 0, oy: 0, oz: 0, ow: 0, col: [1, 1, 1], seed: 0, src: null,
    wave: 0, waveA: 0, rays: 0, flood: 0, floodR: 9, dark: 0, bloom: 0, exposure: 0, vignette: 0, chroma: 0, distort: 0,
  };
}

const tmp = new THREE.Vector3();

export class Reveal {
  constructor({ stage, noise, particles, audio, reduced, still, room, onReveal }) {
    this.stage = stage;
    this.particles = particles;
    this.audio = audio;
    this.reduced = reduced;
    this.still = still;
    this.room = room;
    this.onReveal = onReveal;
    this.group = new THREE.Group();
    this.veil = createVeil();
    this.group.add(this.veil);
    this.layout = null;
    this.focus = null; // slot brought forward
    this.focusZ = 4;
    this.hovered = null;
    this.pointer = null; // CSS px, for the hover tilt
    this.queue = []; // flip all: [{ slot, at }]
    this.slots = Array.from({ length: 5 }, (_, i) => {
      const card = new Card(stage.renderer);
      card.shared.uParallax.value = 0;
      const root = new THREE.Group();
      const fx = createSlotFx(noise);
      root.add(fx.halo, card.group);
      card.group.add(fx.sheen, fx.leak, fx.stamp);
      root.visible = false;
      this.group.add(root);
      return {
        i,
        card,
        root,
        fx,
        v: restV(),
        yaw: PI,
        rarity: rarityById.common,
        data: null,
        stampRect: [0, 0, 0, 0],
        arc: 0,
        shown: false,
        away: 0,
        faceUp: false,
        flip: null,
        hover: 0,
        focusAmt: 0,
        tilt: { x: 0, y: 0 },
        concealed: true,
        spin: i % 2 ? 1 : -1,
      };
    });
  }

  // Puts a new pull on the slots (face down). Resolves when every card's textures are in.
  // The textures load straight away; the slots change only once `free` resolves (the cards of
  // the pull before may still be on screen, sweeping off).
  async deal(cards, free) {
    const tex = await Promise.all(cards.map((c, i) => this.slots[i].card.load(c)));
    await free;
    this.queue.length = 0;
    this.focus = null;
    await Promise.all(cards.map((c, i) => this.slots[i].card.show(c)));
    cards.forEach((c, i) => {
      const s = this.slots[i];
      s.stampRect = tex[i].info.stamp;
      s.data = c;
      s.rarity = rarityById[c.rarity];
      s.yaw = PI;
      s.faceUp = false;
      s.flip = null;
      s.focusAmt = 0;
      s.tilt.x = s.tilt.y = 0;
      s.card.mats.card.uStampOn.value = s.rarity.id === "mythic" ? 0 : 1;
      this.conceal(s, true);
    });
  }

  conceal(s, on) {
    s.concealed = on;
    s.card.conceal(on);
    s.fx.color.setRGB(...(on ? HOVER_COL : s.rarity.linear));
  }

  setLayout(layout) {
    this.layout = layout;
  }

  // the pull's best card: highest rarity, the later one on a tie
  get best() {
    let b = this.slots[0];
    for (const s of this.slots) if (s.rarity.index >= b.rarity.index) b = s;
    return b;
  }

  get faceDown() {
    return this.slots.filter((s) => !s.faceUp && !s.flip);
  }

  get allUp() {
    return this.slots.every((s) => s.faceUp);
  }

  get busy() {
    return this.slots.some((s) => s.flip) || this.queue.length > 0;
  }

  flipSlot(slot, clock, { full } = {}) {
    if (slot.faceUp || slot.flip) return null;
    this.conceal(slot, false);
    const best = this.best;
    const isFull = this.reduced ? false : full ?? (slot === best || !best.faceUp);
    const tl = buildFlip({
      slot,
      room: this.room,
      particles: this.particles,
      audio: this.audio,
      reduced: this.reduced,
      full: isFull,
      view: () => this.viewRect(),
      onReveal: (s) => {
        s.faceUp = true;
        this.onReveal?.(s);
      },
    });
    tl.onEnd = () => {
      slot.flip = null;
    };
    slot.flip = tl;
    tl.play(clock);
    return tl;
  }

  // every face-down card in table order, except that the pack's best goes last so the run ends on
  // its full show (sorting by rarity would give the order away as the cards turn)
  flipAll(clock) {
    const best = this.best;
    const order = this.faceDown.sort((a, b) => (a === best) - (b === best) || a.i - b.i);
    let at = clock;
    this.queue = order.map((slot) => {
      const q = { slot, at, full: slot === best };
      at += this.reduced ? 0.18 : slot === best ? 0 : 0.34;
      return q;
    });
  }

  // still frames: start a flip so that `t` seconds of it have passed
  seekFlip(slot, clock, t) {
    const tl = this.flipSlot(slot, clock);
    if (tl) tl.seek(clock, t);
  }

  setFaceUp(slot) {
    slot.yaw = 0;
    slot.faceUp = true;
    slot.card.mats.card.uStampOn.value = 1;
    this.conceal(slot, false);
  }

  // Slot position on the table (landed), in world units.
  target(i) {
    const L = this.layout?.slots[i] ?? { x: 0, y: 0, rz: 0 };
    return L;
  }

  // The visible world rectangle at the table (z = 0): centre and half sizes.
  viewRect() {
    const st = this.stage;
    const wpp = st.worldPerPx;
    return {
      cx: (innerWidth / 2 - st.center.x) * wpp + st.view.x,
      cy: (st.center.y - innerHeight / 2) * wpp + st.view.y,
      hw: (innerWidth * wpp) / 2,
      hh: (innerHeight * wpp) / 2,
    };
  }

  // Screen rectangle of a slot (CSS px), for hit testing.
  screenRect(slot) {
    const cam = this.stage.camera;
    slot.root.getWorldPosition(tmp);
    const z = tmp.z;
    tmp.project(cam);
    const cx = ((tmp.x + 1) / 2) * innerWidth;
    const cy = ((1 - tmp.y) / 2) * innerHeight;
    const ppu = this.stage.pxPerUnitAt(z) / this.stage.view.zoom;
    const s = slot.root.scale.x;
    return { cx, cy, hw: (CARD_W / 2) * s * ppu, hh: (CARD_H / 2) * s * ppu };
  }

  hit(x, y) {
    if (this.focus) {
      const r = this.screenRect(this.focus);
      return Math.abs(x - r.cx) < r.hw && Math.abs(y - r.cy) < r.hh ? this.focus : null;
    }
    let found = null;
    for (const s of this.slots) {
      if (!s.root.visible || s.arc < 1 || s.away > 0) continue;
      const r = this.screenRect(s);
      if (Math.abs(x - r.cx) < r.hw * 1.04 && Math.abs(y - r.cy) < r.hh * 1.04) found = s;
    }
    return found;
  }

  // Per frame: reset the transient state, run the flips, then compose every slot.
  // clock: the sequence clock; time: the shader clock (idle float, frozen when still).
  beginFrame() {
    for (const s of this.slots) Object.assign(s.v, restV());
  }

  runFlips(clock) {
    while (this.queue.length && this.queue[0].at <= clock) {
      const q = this.queue.shift();
      this.flipSlot(q.slot, q.at, { full: q.full });
    }
    for (const s of this.slots) if (s.flip) s.flip.update(clock);
  }

  compose(dt, time, focusPose) {
    const smooth = (cur, target, rate) => (this.still || this.reduced ? target : cur + (target - cur) * (1 - Math.exp(-rate * dt)));
    let veil = 0;
    const wave = this.waveOnScreen();

    for (const s of this.slots) {
      const v = s.v;
      const L = this.target(s.i);
      s.root.visible = s.shown;
      if (!s.shown) continue;

      // fly out of the pack: a quadratic arc from the pack's mouth, spinning down into place
      const k = ease.out3(Math.min(1, s.arc));
      const p0x = 0, p0y = TEAR_Y - 0.6, p0z = -0.05;
      const p1x = L.x * 0.5, p1y = Math.max(L.y, 0) + 1.6, p1z = 0.6;
      const a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
      let x = a * p0x + b * p1x + c * L.x;
      let y = a * p0y + b * p1y + c * L.y;
      let z = a * p0z + b * p1z;
      let scale = lerp(0.6, 1, k);
      let rz = L.rz + (1 - k) * s.spin * 2.6;
      let pitch = (1 - k) * 0.7;

      // collect: down and away
      if (s.away > 0) {
        const w = s.away;
        x = lerp(x, x * 0.4, w);
        y -= 7 * w;
        z += 0.4 * w;
        rz += s.spin * 0.7 * w;
        scale *= 1 - 0.3 * w;
      }

      // hover (pointer or finger)
      const landed = s.arc >= 1 && s.away === 0;
      const hoverOn = landed && this.hovered === s && !this.focus && !s.flip ? 1 : 0;
      s.hover = smooth(s.hover, hoverOn, 14);
      const h = s.hover;
      z += 0.15 * h;
      scale *= 1 + 0.04 * h;
      v.glow += (s.faceUp ? 0.3 : 0.6) * h;
      // tilt toward the pointer, the same for every card
      let tx = 0;
      let ty = 0;
      if (hoverOn && this.pointer && !this.reduced) {
        const r = this.screenRect(s);
        tx = Math.max(-1, Math.min(1, (this.pointer.x - r.cx) / r.hw));
        ty = Math.max(-1, Math.min(1, (this.pointer.y - r.cy) / r.hh));
      }
      s.tilt.x = smooth(s.tilt.x, tx, 10);
      s.tilt.y = smooth(s.tilt.y, ty, 10);

      // settled cards breathe a little; face-up ones keep a quiet glow of their rarity
      if (landed && !this.reduced) {
        y += 0.012 * Math.sin(time * 0.9 + s.i * 1.7);
        rz += 0.006 * Math.sin(time * 0.7 + s.i * 2.3);
      }
      if (s.faceUp && !s.flip) v.glow += 0.08 + 0.06 * s.rarity.index;

      // the reveal's light ring passing under a card rocks it outward and lights it in the
      // reveal's colour (never its own: a face-down card stays a surprise)
      let lit = 0;
      if (wave && landed && !s.flip) {
        const r = this.screenRect(s);
        const ddx = (r.cx - wave.x) / innerHeight;
        const ddy = (r.cy - wave.y) / innerHeight;
        const dist = Math.hypot(ddx, ddy);
        if (dist > 0.04) {
          lit = wave.a * Math.exp(-(((wave.r - dist) / 0.16) ** 2));
          const nx = ddx / dist;
          const ny = -ddy / dist;
          v.dx += nx * 0.16 * lit;
          v.dy += ny * 0.16 * lit;
          v.dz += 0.1 * lit;
          v.rz -= nx * 0.07 * lit;
          v.pitch -= ny * 0.18 * lit;
          v.glow += 0.9 * lit;
        }
      }
      if (s.concealed) {
        const m = Math.min(1, lit * 2);
        const rc = this.room.col;
        s.fx.color.setRGB(lerp(HOVER_COL[0], rc[0], m), lerp(HOVER_COL[1], rc[1], m), lerp(HOVER_COL[2], rc[2], m));
      }

      // brought forward
      const focusOn = this.focus === s ? 1 : 0;
      s.focusAmt = smooth(s.focusAmt, focusOn, 9);
      const f = ease.inOut2(s.focusAmt);
      veil = Math.max(veil, f);
      let yaw = s.yaw;
      if (f > 0.001) {
        x = lerp(x, 0, f);
        y = lerp(y, 0, f);
        z = lerp(z, this.focusZ, f);
        rz = lerp(rz, 0, f);
        if (this.focus === s && focusPose) {
          pitch += focusPose.pitch * f;
          yaw += focusPose.yaw * f;
          rz += focusPose.roll * f;
          y += focusPose.lift * f;
        }
      }

      s.root.position.set(x + v.dx, y + v.dy, z + v.dz);
      s.root.rotation.set(0, 0, rz + v.rz);
      s.root.scale.setScalar(scale * (1 + v.s));
      s.card.group.rotation.set(pitch + v.pitch + 0.16 * s.tilt.y, yaw + 0.2 * s.tilt.x, 0, "XYZ");
      // the card renders above its neighbours while it's lifted or turning
      const lifted = s.flip || f > 0.01 || h > 0.01;
      s.card.mesh.renderOrder = lifted ? 2 : 0;

      s.fx.apply(v);
      s.fx.placeStamp(s.stampRect, v.stampScale);
    }
    this.veil.visible = veil > 0.002;
    this.veil.material.opacity = 0.72 * veil;
  }

  // the room's light ring this frame, on screen (CSS px, radius in screen heights), or null
  waveOnScreen() {
    const room = this.room;
    if (this.reduced || room.waveA < 0.01) return null;
    tmp.set(room.ox, room.oy, room.oz).project(this.stage.camera);
    return { x: ((tmp.x + 1) / 2) * innerWidth, y: ((1 - tmp.y) / 2) * innerHeight, r: room.wave, a: Math.min(1.2, room.waveA) };
  }

  setTime(t) {
    for (const s of this.slots) {
      s.card.shared.uTime.value = t;
      s.fx.time.value = t;
    }
  }

  // every card's light uniforms, for the room's light changes
  get lightSets() {
    return this.slots.map((s) => s.card.shared);
  }

  // Compiles everything a pull can show before the first pack is opened: the five fronts and
  // the flip effects, as drawn through the post pass's target.
  async warmUp(camera, target) {
    const s = this.slots[0];
    const extra = [s.fx.halo, s.fx.sheen, s.fx.leak, s.fx.stamp, this.veil].map((m) => new THREE.Mesh(m.geometry, m.material));
    await s.card.warmUp(camera, { extra, target });
  }
}
