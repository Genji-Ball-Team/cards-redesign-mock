import { icons } from "./icons.js";
import { navHtml, bindNav } from "./nav.js";
import { CARDS, RARITIES, rarityById, printLabel } from "../data/cards.js";

// Header (nav, card name) and the bottom dock (rarity strip, prev / flip / depth / next,
// plus a tilt button where the browser needs permission for motion sensors).
// The dock is the only interactive chrome; it never overlaps the card box.

export function createControls(root, handlers) {
  root.innerHTML = `
    <header class="top">
      ${navHtml("cards")}
      <div class="name" aria-live="polite">
        <span class="rarity-tag"></span>
        <h1 class="card-name"></h1>
        <p class="card-title"></p>
      </div>
      <span class="count gb-num"></span>
    </header>
    <nav class="dock" aria-label="Card viewer">
      <div class="rarities" role="tablist" aria-label="Rarity"></div>
      <div class="actions">
        <button class="btn" data-act="prev" aria-label="Previous card">${icons.prev}<span>Prev</span></button>
        <button class="btn" data-act="flip" aria-label="Flip card" aria-pressed="false">${icons.flip}<span>Flip</span></button>
        <button class="btn" data-act="depth" aria-label="Art depth" aria-pressed="false">${icons.depth}<span>Depth</span></button>
        <button class="btn" data-act="tilt" aria-label="Motion tilt" aria-pressed="false" hidden>${icons.tilt}<span>Tilt</span></button>
        <button class="btn" data-act="next" aria-label="Next card">${icons.next}<span>Next</span></button>
      </div>
    </nav>`;

  const $ = (s) => root.querySelector(s);
  const rarRow = $(".rarities");
  for (const r of RARITIES) {
    const count = CARDS.filter((c) => c.rarity === r.id).length;
    const b = document.createElement("button");
    b.className = "rar";
    b.dataset.rarity = r.id;
    b.setAttribute("role", "tab");
    b.style.setProperty("--rc", `var(--r-${r.id})`);
    b.innerHTML = `<i class="gem" aria-hidden="true"></i><span class="full">${r.label}</span><span class="pips" aria-hidden="true">${"<b></b>".repeat(count)}</span>`;
    b.addEventListener("click", () => handlers.rarity(r.id));
    rarRow.append(b);
  }

  if (handlers.nav) bindNav(root, handlers.nav);

  root.querySelector(".actions").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (btn) handlers[btn.dataset.act]?.();
  });

  return {
    dock: $(".dock"),
    header: $(".top"),
    setCard(card) {
      const r = rarityById[card.rarity];
      root.style.setProperty("--accent", `var(--r-${r.id})`);
      const tag = $(".rarity-tag");
      tag.textContent = card.print != null ? `${r.label} · ${printLabel(card)}` : r.label;
      $(".card-name").textContent = card.name;
      $(".card-title").textContent = card.title;
      const i = CARDS.indexOf(card);
      $(".count").textContent = `${String(i + 1).padStart(2, "0")} / ${String(CARDS.length).padStart(2, "0")}`;
      const inRarity = CARDS.filter((c) => c.rarity === card.rarity);
      for (const b of rarRow.children) {
        const on = b.dataset.rarity === card.rarity;
        b.setAttribute("aria-selected", String(on));
        b.querySelectorAll(".pips b").forEach((p, j) => p.classList.toggle("on", on && inRarity[j] === card));
      }
    },
    setSide(side) {
      $('[data-act="flip"]').setAttribute("aria-pressed", String(side === "back"));
    },
    setDepth(on) {
      $('[data-act="depth"]').setAttribute("aria-pressed", String(on));
    },
    showTilt(show, on = false) {
      const b = $('[data-act="tilt"]');
      b.hidden = !show;
      b.setAttribute("aria-pressed", String(on));
    },
  };
}
