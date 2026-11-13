import * as THREE from "three";
import { params } from "../params.js";
import { CARDS, RARITIES, cardIndex } from "../data/cards.js";
import { CARD_W, CARD_H } from "../card/geometry.js";
import { Card } from "../card/card.js";
import { Motion } from "../input/motion.js";
import { attachPointer } from "../input/pointer.js";
import { createGyro } from "../input/gyro.js";
import { createControls } from "../ui/controls.js";

const DEG = Math.PI / 180;

// The card viewer: one card on the stage, step through them, flip, drag, tilt.
export function createCardsScreen({ stage, root, reduced, still, onNav }) {
  const group = new THREE.Group();
  group.visible = false;
  stage.scene.add(group);
  const card = new Card(stage.renderer);
  group.add(card.group);
  let active = false;

  const state = {
    index: cardIndex(params.card),
    parallax: params.parallax,
    pending: null, // card waiting to be swapped in once the front is hidden
    pendingAge: 0,
  };
  card.shared.uParallax.value = state.parallax ? 1 : 0;

  const motion = new Motion({ reduced, still, yaw: params.ry * DEG, pitch: params.rx * DEG, side: params.side });

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
    if (CARDS[state.index].rarity === id) return;
    go(CARDS.findIndex((c) => c.rarity === id));
  };

  const setDepth = (on) => {
    state.parallax = on;
    controls.setDepth(on);
    if (still || reduced) card.shared.uParallax.value = on ? 1 : 0;
  };

  const gyro = still ? null : createGyro(motion, { onAvailable: () => controls.showTilt(true, true) });

  const controls = createControls(root, {
    nav: onNav,
    rarity: goRarity,
    prev: () => go(state.index - 1),
    next: () => go(state.index + 1),
    flip: () => motion.flip(),
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
  controls.setDepth(state.parallax);
  controls.setCard(CARDS[state.index]);

  attachPointer(stage.canvas, motion, stage, { onTap: () => motion.flip(), enabled: () => active });

  function preloadAround(i) {
    for (const d of [1, -1]) card.load(CARDS[(i + d + CARDS.length) % CARDS.length]).catch(() => {});
  }

  // the card gets the space between header and dock
  const layout = () => {
    if (!active) return;
    const w = innerWidth;
    const h = innerHeight;
    const pad = w >= 720 ? 28 : 14;
    let top = pad;
    let bottom = h - pad;
    if (!params.hideUi) {
      bottom = controls.dock.getBoundingClientRect().top - pad;
      // On wide screens the name block sits at the left: if the card would clear it, let the
      // card start just under the nav row instead of under the whole header.
      const brandBottom = controls.header.querySelector(".brand").getBoundingClientRect().bottom + pad;
      const nameRight = controls.header.querySelector(".name").getBoundingClientRect().right;
      const cardHalfW = ((bottom - brandBottom) / 1.1) * 0.727 * 0.56;
      if (w / 2 - cardHalfW > nameRight + 32) top = brandBottom;
      else top = controls.header.getBoundingClientRect().bottom + pad;
    }
    stage.setFit(CARD_W * 1.12, CARD_H * 1.1, CARD_H);
    stage.setBox({ x: pad, y: top, w: w - 2 * pad, h: Math.max(120, bottom - top) });
  };

  const ready = card.show(CARDS[state.index]).then(() => {
    preloadAround(state.index);
    if (!still) card.warmUp(stage.camera).catch(() => {});
  });

  const bd = stage.backdrop.uniforms;

  return {
    ready,
    layout,
    show() {
      active = true;
      root.hidden = false;
      group.visible = true;
      stage.setView(0, 0, 1);
      bd.uDim.value = 0;
      bd.uGlow.value.setRGB(0, 0, 0);
      bd.uAccent.value.copy(card.accentTarget);
      layout();
    },
    hide() {
      active = false;
      root.hidden = true;
      group.visible = false;
    },
    update(dt, clock) {
      card.shared.uTime.value = clock;
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
    },
    keydown(k) {
      if (k === "arrowright") go(state.index + 1);
      else if (k === "arrowleft") go(state.index - 1);
      else if (k === "f" || k === " ") motion.flip();
      else if (k === "d") setDepth(!state.parallax);
      else if (k >= "1" && k <= "5") goRarity(RARITIES[Number(k) - 1].id);
      else return false;
      return true;
    },
  };
}
