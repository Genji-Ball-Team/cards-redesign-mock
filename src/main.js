import "./styles/app.css";
import { params } from "./params.js";
import { loadFonts } from "./card/text.js";
import { Stage } from "./scene/stage.js";
import { Audio } from "./audio/audio.js";
import { createCardsScreen } from "./screens/cards.js";
import { createPackScreen } from "./screens/pack.js";

// Router and frame loop. Two screens share one canvas and stage: Pack (home) and Cards (the
// viewer). Two clocks:
//   time   drives shaders (shimmer, embers, dust); frozen for still shots and reduced motion
//   seq    drives the pack sequence and flips; runs under reduced motion (the calm versions need
//          it), frozen for still shots

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
  const audio = new Audio();
  const app = document.getElementById("app");

  // sound starts with the first gesture
  const unlock = () => audio.unlock();
  addEventListener("pointerdown", unlock, { capture: true });
  addEventListener("keydown", unlock, { capture: true });

  const screens = {};
  let current = null;
  const make = (id) => {
    if (screens[id]) return screens[id];
    const root = document.createElement("div");
    root.className = `screen screen-${id}`;
    root.hidden = true;
    app.append(root);
    const opts = { stage, root, audio, reduced, still, onNav: (to) => go(to) };
    screens[id] = id === "cards" ? createCardsScreen(opts) : createPackScreen(opts);
    return screens[id];
  };

  const go = (id) => {
    const next = make(id);
    if (next === current) return;
    current?.hide();
    current = next;
    current.show();
    const url = new URL(location.href);
    url.search = id === "pack" ? "" : `?screen=${id}`;
    history.replaceState(null, "", url);
    document.title = id === "pack" ? "Genji Ball Cards" : "Cards · Genji Ball";
    canvas.setAttribute("aria-label", id === "pack" ? "Booster pack, tap to open" : "Card, drag to spin, tap to flip");
  };

  current = make(params.screen);
  current.show();
  canvas.setAttribute("aria-label", params.screen === "pack" ? "Booster pack, tap to open" : "Card, drag to spin, tap to flip");

  const layout = () => current.layout();
  new ResizeObserver(layout).observe(app);
  addEventListener("resize", layout);

  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    // space / enter on a focused button belong to the button
    if ((k === " " || k === "enter") && e.target !== document.body) return;
    if (current.keydown(k)) e.preventDefault();
  });

  await current.ready;
  let time = params.time;
  let seq = params.time;
  current.applyStartState?.(seq);

  // ---------- loop ----------
  const bd = stage.backdrop.uniforms;
  let last = performance.now();
  let raf = 0;
  let frames = 0;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dtMs = now - last;
    last = now;
    const dt = Math.min(dtMs / 1000, 0.1);
    if (!still && !reduced) time += dt;
    if (!still) seq += dt;
    bd.uTime.value = time;
    stage.dust.uniforms.uTime.value = time;
    current.update(dt, time, seq);
    stage.render();
    if (frames++ > 2 && !window.__ready) window.__ready = true;
    stage.sample(dtMs);
  };

  document.addEventListener("visibilitychange", () => {
    audio.suspend(document.hidden);
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
