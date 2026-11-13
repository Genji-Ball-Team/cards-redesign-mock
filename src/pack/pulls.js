import { CATALOG, catalogById } from "../data/catalog.js";
import { rarityById } from "../data/cards.js";

// Mock pulls: five cards per pack, rolled on the pack type's odds, or rigged from the URL
// (?pull=common,common,rare,epic,mythic, or card ids, or both mixed). No repeats inside a pack.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRarity(odds, rand) {
  const entries = Object.entries(odds);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let x = rand() * total;
  for (const [id, w] of entries) {
    x -= w;
    if (x <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

function pickCard(rarity, rand, taken) {
  const pool = CATALOG.filter((c) => c.rarity === rarity && !taken.has(c.id));
  const from = pool.length ? pool : CATALOG.filter((c) => c.rarity === rarity);
  return from[Math.floor(rand() * from.length)];
}

// Rolled on the type's per-slot odds, then shuffled: the guaranteed slot must not always land in
// the same place on the table, or its position would give the best card away before the flip.
export function rollPack(type, rand) {
  const taken = new Set();
  const cards = type.slots.map((odds) => {
    const c = pickCard(pickRarity(odds, rand), rand, taken);
    taken.add(c.id);
    return c;
  });
  return shuffle(cards, rand);
}

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "common,rare,fealthy,legendary,god" -> five cards. Unknown entries roll on the pack's odds.
export function riggedPack(spec, type, rand) {
  const parts = spec.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const taken = new Set(parts.filter((p) => catalogById[p]));
  const rolled = rollPack(type, rand);
  return Array.from({ length: 5 }, (_, i) => {
    const p = parts[i];
    let c;
    if (p && catalogById[p]) c = catalogById[p];
    else if (p && rarityById[p]) c = pickCard(p, rand, taken);
    else c = rolled[i];
    taken.add(c.id);
    return c;
  });
}

// The first pack of a visit shows one of each rarity, in a shuffled order, so the reveal's
// range is on show straight away (later packs are random).
export function demoPack(rand) {
  const order = ["common", "rare", "epic", "legendary", "mythic"];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const taken = new Set();
  return order.map((r) => {
    const c = pickCard(r, rand, taken);
    taken.add(c.id);
    return c;
  });
}
