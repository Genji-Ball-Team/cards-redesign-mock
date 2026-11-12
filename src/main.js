import "./styles/app.css";
import { params } from "./params.js";
import { CARDS, RARITIES, cardIndex } from "./data/cards.js";
import { loadFonts } from "./card/text.js";
import { Stage } from "./scene/stage.js";
import { Card } from "./card/card.js";
import { Motion } from "./input/motion.js";
import { attachPointer } from "./input/pointer.js";
import { createGyro } from "./input/gyro.js";
import { createControls } from "./ui/controls.js";

const DEG = Math.PI / 180;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const still = params.still;

// Errors are collected for the screenshot script.
window.__errors = [];
window.addEventListener("error", (e) => window.__errors.push(String(e.message || e)));
window.addEventListener("unhandledrejection", (e) => window.__errors.push(String(e.reason)));

if (params.hideUi) document.documentElement.classList.add("ui-hidden");

async function boot() {
  await loadFonts();

  const canvas = document.getElementById("stage");
  const stage = new Stage(canvas, { adaptive: !still });
  const card = new Card(stage.renderer);
  stage.scene.add(card.group);

  const state = {
    index: cardIndex(params.card),
    back: params.back,
    parallax: params.parallax,
    pending: null, // card waiting to be swapped in once the front is hidden
    pendingAge: 0,
  };

  card.setBack(state.back);
  card.shared.uParallax.value = state.parallax ? 1 : 0;

  const motion = new Motion({
    reduced,
    still,
    yaw: params.ry * DEG,
    pitch: params.rx * DEG,
    side: params.side,
  });

  // ---------- controls ----------
  const go = (to) => {
    const n = CARDS.length;
    const next = ((to % n) + n) % n;
    if (next === state.index && !state.pending) return;
    const dir = Math.sign(to - state.index) || 1;
    state.index = next;
    const target = CARDS[next];
    controls.setCard(target);
    preloadAround(next);
    card.load(target).then(() => {
      if (CARDS[state.index] !== target) return; // stepped on again meanwhile
      if (reduced || still || motion.facingBack) {
        // nothing to hide behind (or the front is already out of view): swap now
        state.pending = null;
        card.show(target);
        if (motion.facingBack && !reduced && !still) motion.spin(dir);
      } else {
        state.pending = target;
        state.pendingAge = 0;
        motion.spin(dir);
      }
    });
  };

  const goRarity = (id) => {
    const cur = CARDS[state.index];
    if (cur.rarity === id) return;
    go(CARDS.findIndex((c) => c.rarity === id));
  };

  const setBack = (variant) => {
    state.back = variant;
    card.setBack(variant);
    controls.setBack(variant);
    motion.setFacing(true); // show what changed
  };

  const setDepth = (on) => {
    state.parallax = on;
    controls.setDepth(on);
    if (still || reduced) card.shared.uParallax.value = on ? 1 : 0;
  };

  const gyro = still ? null : createGyro(motion, { onAvailable: () => controls.showTilt(true, true) });

  const controls = createControls(document.getElementById("app"), {
    rarity: goRarity,
    prev: () => go(state.index - 1),
    next: () => go(state.index + 1),
    flip: () => motion.flip(),
    back: () => setBack(state.back === "green" ? "dark" : "green"),
    depth: () => setDepth(!state.parallax),
    tilt: async () => {
      if (!gyro) return;
      if (gyro.enabled) {
        gyro.stop();
        controls.showTilt(true, false);
      } else {
        const ok = await gyro.request();
        controls.showTilt(true, ok);
      }
    },
  });
  if (gyro?.needsPermission) controls.showTilt(true, false);

  motion.onSide = (side) => controls.setSide(side);
  controls.setSide(motion.side);
  controls.setBack(state.back);
  controls.setDepth(state.parallax);
  controls.setCard(CARDS[state.index]);

  attachPointer(canvas, motion, stage, { onTap: () => motion.flip() });

  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === "arrowright") go(state.index + 1);
    else if (k === "arrowleft") go(state.index - 1);
    else if (k === "f" || (k === " " && e.target === document.body)) motion.flip();
    else if (k === "b") setBack(state.back === "green" ? "dark" : "green");
    else if (k === "d") setDepth(!state.parallax);
    else if (k >= "1" && k <= "5") goRarity(RARITIES[Number(k) - 1].id);
    else return;
    e.preventDefault();
  });

  // ---------- layout: the card gets the space between header and dock ----------
  const layout = () => {
    const w = innerWidth;
    const h = innerHeight;
    const pad = w >= 720 ? 28 : 14;
    let top = pad;
    let bottom = h - pad;
    if (!params.hideUi) {
      bottom = controls.dock.getBoundingClientRect().top - pad;
      // On wide screens the name block sits at the left: if the card would clear it, let the
      // card start just under the brand row instead of under the whole header.
      const brandBottom = controls.header.querySelector(".brand").getBoundingClientRect().bottom + pad;
      const nameRight = controls.header.querySelector(".name").getBoundingClientRect().right;
      const cardHalfW = ((bottom - brandBottom) / 1.1) * 0.727 * 0.56;
      if (w / 2 - cardHalfW > nameRight + 32) top = brandBottom;
      else top = controls.header.getBoundingClientRect().bottom + pad;
    }
    const boxH = Math.max(120, bottom - top);
    stage.setBox({ x: pad, y: top, w: w - 2 * pad, h: boxH });
  };
  new ResizeObserver(layout).observe(document.getElementById("app"));
  addEventListener("resize", layout);
  layout();

  // ---------- first card ----------
  await card.show(CARDS[state.index]);
  preloadAround(state.index);
  if (!still) card.warmUp(stage.camera).catch(() => {});

  function preloadAround(i) {
    for (const d of [1, -1]) card.load(CARDS[(i + d + CARDS.length) % CARDS.length]).catch(() => {});
  }

  // ---------- loop ----------
  const bd = stage.backdrop.uniforms;
  bd.uAccent.value.copy(card.accentTarget);
  let last = performance.now();
  let clock = params.time;
  let raf = 0;
  let frames = 0;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dtMs = now - last;
    last = now;
    const dt = Math.min(dtMs / 1000, 0.1);

    // time drives the shimmer, embers and dust; frozen for still shots and reduced motion
    if (!still && !reduced) clock += dt;
    card.shared.uTime.value = clock;
    bd.uTime.value = clock;
    stage.dust.uniforms.uTime.value = clock;

    if (!still && !reduced) {
      const target = state.parallax ? 1 : 0;
      const u = card.shared.uParallax;
      u.value += (target - u.value) * (1 - Math.exp(-6 * dt));
    }
    bd.uAccent.value.lerp(card.accentTarget, still ? 1 : 1 - Math.exp(-3 * dt));

    const o = motion.update(dt, clock);
    card.group.rotation.set(o.pitch, o.yaw, o.roll, "XYZ");
    card.group.position.y = o.lift;

    if (state.pending) {
      state.pendingAge += dt;
      // swap while the back faces the camera, or give up waiting (an interrupted spin)
      if (Math.cos(o.yaw) < -0.1 || state.pendingAge > 0.9) {
        const c = state.pending;
        state.pending = null;
        card.show(c);
      }
    }

    stage.render();
    if (frames++ > 2 && !window.__ready) window.__ready = true;
    stage.sample(dtMs);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  raf = requestAnimationFrame(frame);
}

boot().catch((err) => {
  console.error(err);
  window.__errors.push(String(err?.stack || err));
  window.__ready = true;
});
