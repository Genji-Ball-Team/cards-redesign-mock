import * as THREE from "three";
import { params } from "../params.js";
import { CARD_W, CARD_H } from "../card/geometry.js";
import { sharedNoise } from "../card/card.js";
import { Motion } from "../input/motion.js";
import { attachPointer } from "../input/pointer.js";
import { Pack } from "../pack/pack.js";
import { PACK_W, PACK_H } from "../pack/packMesh.js";
import { PACK_TYPES, packTypeById } from "../pack/packTypes.js";
import { rng, rollPack, riggedPack, demoPack } from "../pack/pulls.js";
import { Particles } from "../pack/particles.js";
import { Reveal, restRoom } from "../pack/reveal.js";
import { buildOpening, buildCollect } from "../pack/sequence.js";
import { spreadLayout } from "../pack/spread.js";
import { shake, lerp } from "../pack/timeline.js";
import { createPackControls } from "../ui/packControls.js";
import { restPost } from "../scene/post.js";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const KEY = [1.0, 0.96, 0.9];
const RIM = [0.55, 0.85, 0.75];
const RED_RIM = [1.0, 0.22, 0.08];

// The pack screen: one pack on the stage; tap it and the show runs: anticipation, tear, burst,
// five cards into a spread, then the reveal. Modes: idle -> opening -> reveal -> collect -> idle.
export function createPackScreen({ stage, root, audio, reduced, still, onNav }) {
  const group = new THREE.Group();
  group.visible = false;
  stage.scene.add(group);
  const noise = sharedNoise();

  const small = Math.min(innerWidth, innerHeight) < 600 || (navigator.hardwareConcurrency ?? 8) <= 4;
  const particles = new Particles(small ? 1100 : 1800, small ? 0.6 : 1);
  const room = restRoom();
  const pack = new Pack(noise);
  const controls = createPackControls(root, {
    nav: onNav,
    type: (id) => setType(id),
    flipAll: () => flipAll(),
    done: () => done(),
    mute: () => {
      audio.setMuted(!audio.muted);
      controls.setMuted(audio.muted);
    },
  });
  controls.setMuted(audio.muted);

  const reveal = new Reveal({
    stage,
    noise,
    particles,
    audio,
    reduced,
    still,
    room,
    onReveal: (s) => {
      controls.setCard(s.data);
      controls.say(`${s.rarity.label}: ${s.data.name}`);
      accent.setRGB(...s.rarity.linear);
      updateActions();
    },
  });
  group.add(pack.group, reveal.group, particles.points);

  // shared state for the opening / collect timelines
  const S = {
    pack,
    slots: reveal.slots,
    particles,
    audio,
    room,
    reduced,
    camMix: 0,
    packGone: false,
    slotTarget: (i) => reveal.target(i),
  };

  let active = false;
  let mode = "idle";
  let seq = null;
  let seqClock = 0;
  let time = 0;
  let type = packTypeById[params.pack] ?? PACK_TYPES[0];
  let typeChanged = false;
  let firstPull = true;
  let swap = null; // { at, id }
  let pullReady = null;
  let hoverLoop = null;
  let packHover = 0;
  let packHoverOn = false;
  const accent = new THREE.Color();
  const rand = rng(params.seed ?? (still ? 7 : (Date.now() & 0xffffff) ^ 0x5bd1));

  const packMotion = new Motion({ reduced, still, yaw: params.ry * DEG, pitch: params.rx * DEG });
  const focusMotion = new Motion({ reduced, still });

  function roll() {
    let cards;
    if (firstPull && params.pull) cards = riggedPack(params.pull, type, rand);
    else if (firstPull && !typeChanged) cards = demoPack(rand);
    else cards = rollPack(type, rand);
    firstPull = false;
    pullReady = reveal.deal(cards);
    return pullReady;
  }

  function applyType(id) {
    type = packTypeById[id];
    pack.setType(type);
    accent.copy(pack.trim);
    controls.setType(id);
    return roll();
  }

  function setType(id) {
    if (mode !== "idle" || swap || id === type.id || !packTypeById[id]) return;
    typeChanged = true;
    controls.setType(id);
    audio.play("pack-shimmer");
    if (reduced || still) applyType(id);
    else {
      // swap the pouch while its back is to the camera
      packMotion.spin(1);
      swap = { at: seqClock + 0.2, id };
    }
  }

  function setMode(m) {
    mode = m;
    controls.setMode(m === "idle" ? "idle" : m === "reveal" ? "reveal" : "opening");
    updateActions();
  }

  function updateActions() {
    const r = mode === "reveal";
    const downs = reveal.faceDown.length;
    controls.setActions({ flipAll: r && downs >= 2 && !reveal.focus, done: r && reveal.allUp && !reveal.busy });
  }

  function open() {
    if (mode !== "idle" || swap) return;
    setMode("opening");
    audio.play("pack-tap");
    // face the front before it tears
    packMotion.restYaw = Math.round(packMotion.restYaw / TAU) * TAU;
    controls.setCard(null);
    controls.say(`${type.label} pack opened`);
    pullReady.then(() => {
      seq = buildOpening(S);
      seq.onEnd = () => {
        seq = null;
        setMode("reveal");
      };
      seq.play(seqClock);
    });
  }

  function flipAll() {
    if (mode !== "reveal") return;
    unfocus();
    reveal.flipAll(seqClock);
    updateActions();
  }

  function done() {
    if (mode !== "reveal" || !reveal.allUp) return;
    unfocus();
    setHoverLoop(null);
    reveal.hovered = null;
    setMode("collect");
    controls.setCard(null);
    seq = buildCollect(S);
    seq.onEnd = () => {
      seq = null;
      particles.clear();
      accent.copy(pack.trim);
      setMode("idle");
    };
    seq.play(seqClock);
    // the next pull, for the pack that drops in
    roll();
  }

  function tapSlot(s) {
    if (!s) return;
    if (!s.faceUp && !s.flip) {
      reveal.flipSlot(s, seqClock);
      setHoverLoop(null);
      updateActions();
    } else if (s.faceUp && !s.flip) focus(s);
  }

  function focus(s) {
    reveal.focus = s;
    reveal.hovered = null;
    focusMotion.restYaw = 0;
    focusMotion.yaw = 0;
    focusMotion.pitch = 0;
    focusMotion.yawV = focusMotion.pitchV = 0;
    controls.setCard(s.data);
    audio.play("card-whoosh", { rate: 0.8, gain: 0.6 });
    updateActions();
  }

  function unfocus() {
    if (!reveal.focus) return;
    reveal.focus = null;
    audio.play("card-whoosh", { rate: 0.7, gain: 0.5 });
    updateActions();
  }

  function setHoverLoop(name) {
    if (name === hoverLoop) return;
    if (hoverLoop) audio.loop(hoverLoop, false);
    hoverLoop = name;
    if (name) audio.loop(name, true);
  }

  // ---------- input ----------
  const canvas = stage.canvas;
  const packRect = () => {
    const ppu = 1 / stage.worldPerPx;
    return { cx: stage.center.x, cy: stage.center.y, hw: (PACK_W / 2) * ppu, hh: (PACK_H / 2) * ppu };
  };
  attachPointer(canvas, packMotion, stage, { onTap: open, rect: packRect, enabled: () => active && mode === "idle" && !swap });

  const focusRect = () => (reveal.focus ? reveal.screenRect(reveal.focus) : { cx: -1e4, cy: -1e4, hw: 0, hh: 0 });
  attachPointer(canvas, focusMotion, stage, { onTap: () => focusMotion.flip(), rect: focusRect, enabled: () => active && !!reveal.focus });

  let press = null;
  canvas.addEventListener("pointermove", (e) => {
    if (!active) return;
    if (mode === "idle") {
      const r = packRect();
      packHoverOn = e.pointerType === "mouse" && Math.abs(e.clientX - r.cx) < r.hw && Math.abs(e.clientY - r.cy) < r.hh;
      canvas.style.cursor = packHoverOn ? "pointer" : "";
    } else if (mode === "reveal" && !reveal.focus) {
      reveal.pointer = { x: e.clientX, y: e.clientY };
      if (e.pointerType !== "mouse") return;
      reveal.hovered = reveal.hit(e.clientX, e.clientY);
      canvas.style.cursor = reveal.hovered ? "pointer" : "";
    }
  });
  canvas.addEventListener("pointerleave", () => {
    packHoverOn = false;
    if (mode === "reveal" && !press) reveal.hovered = null;
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (!active || mode !== "reveal") return;
    if (reveal.focus) {
      const r = focusRect();
      const away = Math.abs(e.clientX - r.cx) > r.hw * 1.35 || Math.abs(e.clientY - r.cy) > r.hh * 1.35;
      press = away ? { away: true, x: e.clientX, y: e.clientY } : null;
      return;
    }
    const s = reveal.hit(e.clientX, e.clientY);
    reveal.pointer = { x: e.clientX, y: e.clientY };
    press = s ? { slot: s, x: e.clientX, y: e.clientY } : null;
    if (s && e.pointerType !== "mouse") reveal.hovered = s; // touch: glow while pressed
  });
  const release = (e) => {
    if (!press) return;
    const p = press;
    press = null;
    if (e.pointerType !== "mouse") reveal.hovered = null;
    if (e.type === "pointercancel" || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 24) return;
    if (p.away) unfocus();
    else if (reveal.hit(e.clientX, e.clientY) === p.slot) tapSlot(p.slot);
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // ---------- layout ----------
  let layoutInfo = null;
  const packFit = { w: PACK_W * 1.3, h: PACK_H * 1.18, obj: PACK_H };
  function layout() {
    if (!active) return;
    const w = innerWidth;
    const h = innerHeight;
    const pad = w >= 720 ? 24 : 10;
    let top = pad;
    let bottom = h - pad;
    if (!params.hideUi) {
      top = controls.header.getBoundingClientRect().bottom + pad * 0.6;
      bottom = controls.dock.getBoundingClientRect().top - pad;
    }
    const box = { x: pad, y: top, w: w - 2 * pad, h: Math.max(120, bottom - top) };
    stage.setBox(box);
    layoutInfo = spreadLayout(box.w, box.h);
    reveal.setLayout(layoutInfo);
    applyFit();
  }

  function applyFit() {
    if (!layoutInfo) return;
    const k = S.camMix;
    stage.setFit(lerp(packFit.w, layoutInfo.fitW, k), lerp(packFit.h, layoutInfo.fitH, k), lerp(packFit.obj, layoutInfo.obj, k));
  }

  // ---------- the room ----------
  const bd = stage.backdrop.uniforms;
  const tmpV = new THREE.Vector3();
  const postState = restPost();
  const POST_KEYS = ["rays", "flood", "dark", "bloom", "exposure", "vignette", "chroma", "distort"];
  function applyRoom() {
    const dim = Math.min(0.92, room.dim);
    const red = Math.min(1, room.red);
    const sets = [pack.uniforms, ...reveal.lightSets];
    // a reveal's flood and ring light every card in its colour
    const rc = room.col;
    const lit = Math.min(1, room.flood + 0.12 * Math.min(1, room.waveA));
    const kr = KEY[0] * (1 - 0.8 * dim) + 0.42 * red + rc[0] * lit * 0.9;
    const kg = KEY[1] * (1 - 0.8 * dim) + 0.07 * red + rc[1] * lit * 0.9;
    const kb = KEY[2] * (1 - 0.8 * dim) + 0.025 * red + rc[2] * lit * 0.9;
    const rr = lerp(lerp(RIM[0], RED_RIM[0], red * 0.85), rc[0] * 1.4, lit * 0.8);
    const rg = lerp(lerp(RIM[1], RED_RIM[1], red * 0.85), rc[1] * 1.4, lit * 0.8);
    const rb = lerp(lerp(RIM[2], RED_RIM[2], red * 0.85), rc[2] * 1.4, lit * 0.8);
    for (const u of sets) {
      u.uKeyCol.value.setRGB(kr, kg, kb);
      u.uRimCol.value.setRGB(rr, rg, rb);
    }
    bd.uDim.value = dim;
    const gc = room.glowCol;
    const g = room.glow;
    if (gc.isColor) bd.uGlow.value.setRGB(gc.r * g, gc.g * g, gc.b * g);
    else bd.uGlow.value.setRGB(gc[0] * g, gc[1] * g, gc[2] * g);
    // camera: push towards a card, shake
    const a = room.push;
    const sx = shake(seqClock, 47) * room.shake;
    const sy = shake(seqClock + 1.3, 53) * room.shake;
    // a modest zoom: the spread may grow a little, not run under the header and dock
    stage.setView(room.pushX * a * 0.18 + sx, room.pushY * a * 0.18 + sy, 1 - 0.1 * a);
    bd.uTint.value.setRGB(rc[0] * lit * 0.6, rc[1] * lit * 0.6, rc[2] * lit * 0.6);
    // the full-screen pass: the reveal, from where its source is on screen this frame
    tmpV.set(room.ox, room.oy, room.oz).project(stage.camera);
    const p = postState;
    p.x = (tmpV.x + 1) / 2;
    p.y = (tmpV.y + 1) / 2;
    p.col = rc;
    p.seed = room.seed;
    p.wave = room.wave;
    p.waveA = room.waveA;
    p.floodR = room.floodR;
    for (const k of POST_KEYS) p[k] = room[k];
    const f = Math.min(1, room.flash) * 0.5;
    const fc = room.flashCol;
    const c = fc.isColor ? [fc.r, fc.g, fc.b] : fc;
    p.flash = [c[0] * f, c[1] * f, c[2] * f];
    stage.post?.set(p, time);
  }

  // ---------- frames ----------
  function update(dt, shaderClock, clock) {
    time = shaderClock;
    seqClock = clock;
    Object.assign(room, restRoom());
    pack.resetFx();
    reveal.beginFrame();

    if (swap && clock >= swap.at) {
      const id = swap.id;
      swap = null;
      applyType(id);
    }

    if (seq) seq.update(clock);
    reveal.runFlips(clock);
    if (mode === "reveal" && !reveal.busy) updateActions();

    // the pack waiting on the stage: a slow light sweep, a glow at the tear line that breathes
    let sweep = 9;
    if (mode === "idle" && !reduced) {
      const ph = time % 5.5;
      if (ph < 1.5) sweep = -2.3 + (4.6 * ph) / 1.5;
      pack.fx.gather = 0.1 + 0.08 * Math.sin(time * 2.1);
    }
    packHover += ((packHoverOn && mode === "idle" ? 1 : 0) - packHover) * (still ? 1 : 1 - Math.exp(-10 * dt));
    const pose = packMotion.update(dt, time);
    pack.group.visible = !S.packGone;
    pack.apply(pose, { sweep, hover: packHover });

    const focusPose = reveal.focus ? focusMotion.update(dt, time) : null;
    if (layoutInfo) reveal.focusZ = stage.depthFor(CARD_W * 1.2, CARD_H * 1.35);
    reveal.compose(dt, time, focusPose);

    // hover sound for the card under the pointer, face down
    const hs = reveal.hovered;
    // (one neutral sound for every card: the rarity is a surprise until the flip)
    setHoverLoop(hs && !hs.faceUp && !hs.flip ? "card-hover" : null);

    applyFit();
    applyRoom();
    bd.uAccent.value.lerp(accent, still ? 1 : 1 - Math.exp(-3 * dt));
    pack.uniforms.uTime.value = time;
    reveal.setTime(time);
    particles.uniforms.uPixel.value = (stage.dpr * innerHeight) / (2 * stage.tanHalf);
    particles.uniforms.uMaxPx.value = 56 * stage.dpr;
    particles.update(clock);
  }

  // ---------- start ----------
  pack.setType(type);
  accent.copy(pack.trim);
  controls.setType(type.id);
  setMode("idle");
  const ready = roll().then(() => {
    if (!still) reveal.warmUp(stage.camera).catch(() => {});
  });

  // URL states for screenshots and links: an opened pack, a moment of the opening, cards
  // face up, a flip frozen part way, a card pointed at or brought forward.
  function applyStartState(clock) {
    const wantsOpen = params.opened || params.seq != null || params.revealed.length || params.flip != null || params.focus != null || params.hover != null;
    if (!wantsOpen) return;
    seqClock = clock;
    mode = "opening";
    seq = buildOpening(S);
    seq.onEnd = () => {
      seq = null;
      setMode("reveal");
    };
    const settled = params.seq == null;
    seq.seek(clock, settled ? seq.duration + 10 : params.seq);
    if (!settled) {
      setMode("opening");
      return;
    }
    seq.update(clock);
    for (const i of params.revealed) {
      const s = reveal.slots[i];
      reveal.setFaceUp(s);
      reveal.onReveal(s);
    }
    if (params.flip != null) reveal.seekFlip(reveal.slots[params.flip], clock, params.ft);
    if (params.hover != null) reveal.hovered = reveal.slots[params.hover];
    if (params.focus != null) {
      const s = reveal.slots[params.focus];
      if (!s.faceUp) {
        reveal.setFaceUp(s);
        reveal.onReveal(s);
      }
      focus(s);
    }
    updateActions();
  }

  return {
    ready,
    layout,
    applyStartState,
    show() {
      active = true;
      root.hidden = false;
      group.visible = true;
      stage.usePost(true);
      layout();
      audio.loop("music-stage", true);
    },
    hide() {
      active = false;
      root.hidden = true;
      group.visible = false;
      setHoverLoop(null);
      audio.loop("music-stage", false);
      stage.setView(0, 0, 1);
      bd.uDim.value = 0;
      bd.uGlow.value.setRGB(0, 0, 0);
      bd.uTint.value.setRGB(0, 0, 0);
      stage.usePost(false);
      for (const u of [pack.uniforms, ...reveal.lightSets]) {
        u.uKeyCol.value.setRGB(...KEY);
        u.uRimCol.value.setRGB(...RIM);
      }
    },
    update,
    keydown(k) {
      if (mode === "idle") {
        if (k === " " || k === "enter") open();
        else if (k >= "1" && k <= "5") setType(PACK_TYPES[Number(k) - 1].id);
        else return false;
        return true;
      }
      if (mode === "reveal") {
        if (k >= "1" && k <= "5") tapSlot(reveal.slots[Number(k) - 1]);
        else if (k === "f") flipAll();
        else if (k === "escape") unfocus();
        else if (k === "enter" && reveal.allUp && !reveal.busy) done();
        else return false;
        return true;
      }
      return false;
    },
  };
}
