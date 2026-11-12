import { oklchToLinear } from "../color.js";

// Rarity colours agreed for the redesign (same OKLCH values as the CSS tokens in app.css).
export const RARITIES = [
  { id: "common", label: "Common", short: "Com", oklch: [0.88, 0.01, 210] },
  { id: "rare", label: "Rare", short: "Rare", oklch: [0.72, 0.14, 255] },
  { id: "epic", label: "Epic", short: "Epic", oklch: [0.7, 0.18, 305] },
  { id: "legendary", label: "Legendary", short: "Leg", oklch: [0.866, 0.126, 90] },
  { id: "mythic", label: "Mythic", short: "Myth", oklch: [0.626, 0.182, 32] },
].map((r, index) => ({ ...r, index, linear: oklchToLinear(...r.oklch) }));

export const rarityById = Object.fromEntries(RARITIES.map((r) => [r.id, r]));

// Where the art window, frame and border sit is measured from each image (card/zones.js).
// print: mythic cards are numbered prints out of 25 (catalog printRun).
export const CARDS = [
  { id: "kizzura", name: "Kizzura", title: "Ice Dragon Queen", rarity: "common" },
  { id: "cutg", name: "Cutg", title: "The Fallen", rarity: "common" },
  { id: "lunar-aurora", name: "Lunar Aurora", title: "Queen of Dawn", rarity: "common" },
  { id: "babor", name: "Babor", title: "Babortex", rarity: "rare" },
  { id: "frozone", name: "Frozone", title: "The Greatest Discord Mod of All", rarity: "rare" },
  { id: "soulzz", name: "Soulzz", title: "Faxe Cola", rarity: "rare" },
  { id: "prime-baxy", name: "Prime Baxy", title: "Albanian Mafia Member", rarity: "epic" },
  { id: "fealthy", name: "Fealthy", title: "North American v7 Old Goat", rarity: "epic" },
  { id: "dr-gybbus", name: "Dr. Gybbus", title: "French Bot Engineer", rarity: "epic" },
  { id: "onikiri", name: "Onikiri", title: "The Many-Faced", rarity: "legendary" },
  { id: "fynxa", name: "Fynxa", title: "The Awakened One", rarity: "legendary" },
  { id: "darknorth", name: "Darknorth", title: "The Jump Pad Legend", rarity: "legendary" },
  { id: "ipseity", name: "Ipseity", title: "Current #1 French Tracking Demon", rarity: "mythic", print: 7 },
  { id: "shadow-monarch", name: "The Shadow Monarch", title: "Prime Shadow Monarch", rarity: "mythic", print: 1 },
  { id: "god", name: "GOD", title: "Father of NA", rarity: "mythic", print: 13 },
];

export const PRINT_RUN = 25;

export function printLabel(card) {
  if (card.print == null) return "";
  return `${String(card.print).padStart(2, "0")}/${PRINT_RUN}`;
}

export function cardIndex(id) {
  const i = CARDS.findIndex((c) => c.id === id);
  return i < 0 ? 0 : i;
}
