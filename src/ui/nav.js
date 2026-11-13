import { logo } from "./icons.js";

// The mark plus two tabs, Pack and Cards: the same element at the top of both screens.
// The router listens for clicks through onSwitch; links still work without script.
export function navHtml(current) {
  const tab = (id, label) =>
    `<a class="tab" href="?screen=${id}" data-screen="${id}"${id === current ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<nav class="brand" aria-label="Genji Ball Cards">
      <span class="mark" aria-hidden="true">${logo}</span>
      ${tab("pack", "Pack")}${tab("cards", "Cards")}
    </nav>`;
}

export function bindNav(root, onSwitch) {
  root.querySelector(".brand").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-screen]");
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault();
    onSwitch(a.dataset.screen);
  });
}
