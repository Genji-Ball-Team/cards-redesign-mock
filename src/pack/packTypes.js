// The five pack types: odds per slot (from Genji-Ball-Cards/functions/_lib/catalog.js,
// PACK_TYPES, 2026-11-12) and the look of each pouch.
//
// Odds: every pack has 5 cards. The first four roll on the base odds, the last slot depends on
// the type. The real Mythic pack holds a single Mythic; this mock keeps five cards so the reveal
// is the same show, with the last slot a guaranteed Mythic.
//
// Look (linear-ish colours fed to the pack art and shader):
//   foil   the metal's own colour (F0) where the pouch is bare foil
//   ink    the printed stock colour over the foil (matte areas)
//   trim   seal bands, rules and the type label
//   holo   how much rainbow interference the foil shows (0..1)
//   ember  red veins smouldering under the foil (mythic only)

const DAILY = { common: 70, rare: 22, epic: 6, legendary: 1.8, mythic: 0.2 };
const GUARANTEED_RARE = { rare: 70, epic: 22, legendary: 7, mythic: 1 };
const RICH = { common: 62, rare: 30, epic: 6, legendary: 1.8, mythic: 0.2 };

export const PACK_TYPES = [
  {
    id: "daily",
    label: "Daily",
    cost: 0,
    slots: [DAILY, DAILY, DAILY, DAILY, GUARANTEED_RARE],
    look: { foil: [0.62, 0.65, 0.68], ink: "oklch(15% 0.006 220)", inkHi: "oklch(23% 0.008 215)", trim: "oklch(84% 0.01 215)", label: "oklch(92% 0.006 215)", holo: 0.12, ember: 0 },
  },
  {
    id: "starter",
    label: "Starter",
    cost: 0,
    slots: [RICH, RICH, RICH, RICH, { epic: 83, legendary: 15, mythic: 2 }],
    look: { foil: [0.38, 0.8, 0.58], ink: "oklch(20% 0.05 162)", inkHi: "oklch(32% 0.08 160)", trim: "oklch(86% 0.12 158)", label: "oklch(90% 0.12 158)", holo: 0.2, ember: 0 },
  },
  {
    id: "epic",
    label: "Epic",
    cost: 200,
    slots: [RICH, RICH, RICH, RICH, { epic: 80, legendary: 18, mythic: 2 }],
    look: { foil: [0.62, 0.42, 0.9], ink: "oklch(17% 0.05 300)", inkHi: "oklch(28% 0.1 305)", trim: "oklch(78% 0.15 305)", label: "oklch(84% 0.13 305)", holo: 0.85, ember: 0 },
  },
  {
    id: "legendary",
    label: "Legendary",
    cost: 500,
    slots: [DAILY, DAILY, DAILY, DAILY, { legendary: 90, mythic: 10 }],
    look: { foil: [1.0, 0.76, 0.36], ink: "oklch(12% 0.012 80)", inkHi: "oklch(20% 0.03 85)", trim: "oklch(87% 0.13 90)", label: "oklch(90% 0.12 90)", holo: 0.15, ember: 0 },
  },
  {
    id: "mythic",
    label: "Mythic",
    cost: 1000,
    slots: [RICH, RICH, RICH, RICH, { mythic: 100 }],
    look: { foil: [0.85, 0.2, 0.12], ink: "oklch(9% 0.02 25)", inkHi: "oklch(17% 0.06 28)", trim: "oklch(66% 0.19 32)", label: "oklch(72% 0.17 35)", holo: 0.3, ember: 1 },
  },
];

export const packTypeById = Object.fromEntries(PACK_TYPES.map((p) => [p.id, p]));
