import { icons } from "./icons.js";
import { navHtml, bindNav } from "./nav.js";
import { PACK_TYPES } from "../pack/packTypes.js";
import { rarityById, printLabel } from "../data/cards.js";

// Pack screen chrome. Header: nav, the name of the card last turned or brought forward, mute.
// Dock (fixed height so the stage never jumps): pack types while a pack waits, nothing while
// it opens, then "Flip all" / "Done" only when they'd do something.

export function createPackControls(root, handlers) {
  root.innerHTML = `
    <header class="top">
      ${navHtml("pack")}
      <div class="name" style="visibility: hidden">
        <span class="rarity-tag">&nbsp;</span>
        <h1 class="card-name">&nbsp;</h1>
        <p class="card-title">&nbsp;</p>
      </div>
      <button class="icon-btn mute" aria-label="Sound" aria-pressed="true"></button>
    </header>
    <p class="sr-only" aria-live="polite"></p>
    <nav class="dock pack-dock" aria-label="Pack" data-mode="idle">
      <div class="types" role="radiogroup" aria-label="Pack type"></div>
      <div class="reveal-actions">
        <button class="btn" data-act="flipAll" hidden>${icons.flipAll}<span>Flip all</span></button>
        <button class="btn primary" data-act="done" hidden>${icons.done}<span>Done</span></button>
      </div>
    </nav>`;

  const $ = (s) => root.querySelector(s);
  const types = $(".types");
  for (const t of PACK_TYPES) {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.type = t.id;
    b.setAttribute("role", "radio");
    b.style.setProperty("--tc", t.look.trim);
    b.innerHTML = `<span class="chip-label">${t.label}</span>${t.cost ? `<span class="cost gb-num"><i aria-hidden="true">◆</i>${t.cost.toLocaleString("en-US")}</span>` : `<span class="cost free">Free</span>`}`;
    b.addEventListener("click", () => handlers.type(t.id));
    types.append(b);
  }
  bindNav(root, handlers.nav);
  root.querySelector(".reveal-actions").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (btn) handlers[btn.dataset.act]?.();
  });
  const mute = $(".mute");
  mute.addEventListener("click", () => handlers.mute());

  const live = $(".sr-only");
  const dock = $(".pack-dock");
  const name = $(".name");
  let lastActions = "";

  return {
    header: $(".top"),
    dock,
    setType(id) {
      for (const b of types.children) b.setAttribute("aria-checked", String(b.dataset.type === id));
    },
    setMode(mode) {
      dock.dataset.mode = mode;
      dock.toggleAttribute("inert", mode === "opening");
    },
    setActions({ flipAll, done }) {
      const key = `${flipAll}${done}`;
      if (key === lastActions) return;
      lastActions = key;
      $('[data-act="flipAll"]').hidden = !flipAll;
      $('[data-act="done"]').hidden = !done;
    },
    setMuted(m) {
      mute.innerHTML = m ? icons.muted : icons.sound;
      mute.setAttribute("aria-pressed", String(!m));
      mute.setAttribute("aria-label", m ? "Sound off" : "Sound on");
    },
    setCard(card) {
      // hidden, not removed: the header keeps its height so the stage doesn't jump (the
      // placeholders above give the empty block the same height as a filled one)
      name.style.visibility = card ? "" : "hidden";
      if (!card) return;
      const r = rarityById[card.rarity];
      root.style.setProperty("--accent", `var(--r-${r.id})`);
      $(".rarity-tag").textContent = card.print != null ? `${r.label} · ${printLabel(card)}` : r.label;
      $(".card-name").textContent = card.name;
      $(".card-title").textContent = card.title;
    },
    say(text) {
      live.textContent = text;
    },
  };
}
