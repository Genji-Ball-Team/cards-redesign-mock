// URL parameters, mainly so poses are reproducible for screenshots:
//   ?card=onikiri&rx=-12&ry=24&side=back&back=green&still=1&t=4&parallax=1
//   rx / ry: pitch / yaw in degrees. still=1 freezes the pose and time (t = shader time in seconds).

const q = new URLSearchParams(location.search);

function num(name, fallback) {
  const v = q.get(name);
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const params = {
  card: q.get("card"),
  rx: num("rx", 0),
  ry: num("ry", 0),
  side: q.get("side") === "back" ? "back" : "front",
  back: q.get("back") === "green" ? "green" : "dark",
  still: q.get("still") === "1",
  time: num("t", 4),
  parallax: q.get("parallax") === "1", // off by default: see the note in shared.glsl.js
  hideUi: q.get("ui") === "0",
};
