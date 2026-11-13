// URL parameters, mainly so poses and moments are reproducible for screenshots.
//
// Both screens:  screen=pack|open|cards   still=1 (freeze everything)   t=4 (shader time)   ui=0
// Cards viewer:  card=onikiri  rx / ry (pitch / yaw in degrees)  side=back  parallax=1
// Pack screen:   pack=daily|starter|epic|legendary|mythic
//                pull=common,rare,fealthy,legendary,mythic (rarities or card ids, pull order)
//                seed=7 (mock pull)
//                screen=open: the pack is already opened and the cards lie face down
//                seq=0.6        the opening frozen at 0.6 s
//                revealed=0,2   these slots already face up
//                flip=4&ft=1.2  slot 4's flip frozen 1.2 s in
//                hover=1        slot 1 pointed at       focus=2   slot 2 brought forward

const q = new URLSearchParams(location.search);

function num(name, fallback) {
  const v = q.get(name);
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const list = (name) =>
  (q.get(name) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n < 5);

const screen = q.get("screen");

export const params = {
  screen: screen === "cards" ? "cards" : "pack",
  opened: screen === "open",
  card: q.get("card"),
  rx: num("rx", 0),
  ry: num("ry", 0),
  side: q.get("side") === "back" ? "back" : "front",
  still: q.get("still") === "1",
  time: num("t", 4),
  parallax: q.get("parallax") === "1", // off by default: see the note in shared.glsl.js
  hideUi: q.get("ui") === "0",
  pack: q.get("pack"),
  pull: q.get("pull"),
  seed: q.has("seed") ? num("seed", 1) : null,
  seq: q.has("seq") ? num("seq", 0) : null,
  revealed: list("revealed"),
  flip: q.has("flip") ? list("flip")[0] ?? null : null,
  ft: num("ft", 0),
  hover: q.has("hover") ? list("hover")[0] ?? null : null,
  focus: q.has("focus") ? list("focus")[0] ?? null : null,
};
