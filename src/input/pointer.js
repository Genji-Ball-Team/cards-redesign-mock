// Pointer and touch on the canvas:
//   - mouse hover over the card tilts it towards the pointer
//   - press and drag anywhere near the card grabs it and spins it (velocity carried on release)
//   - a short tap / click on the card flips it

const TAP_MOVE = 8; // px
const TAP_TIME = 320; // ms

export function attachPointer(canvas, motion, stage, { onTap } = {}) {
  let down = null;
  const samples = [];

  const cardRect = () => {
    const h = stage.cardPx;
    const w = h * 0.727;
    return { cx: stage.center.x, cy: stage.center.y, hw: w / 2, hh: h / 2 };
  };

  const near = (x, y, pad = 1.15) => {
    const r = cardRect();
    return Math.abs(x - r.cx) < r.hw * pad && Math.abs(y - r.cy) < r.hh * pad;
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (!near(e.clientX, e.clientY, 1.35)) return;
    canvas.setPointerCapture(e.pointerId);
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    samples.length = 0;
    samples.push({ x: e.clientX, y: e.clientY, t: down.t });
    motion.hover.x = motion.hover.y = 0;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (down && e.pointerId === down.id) {
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > TAP_MOVE) {
        down.moved = true;
        motion.beginDrag();
      }
      if (down.moved) {
        const now = performance.now();
        samples.push({ x: e.clientX, y: e.clientY, t: now });
        while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
        const r = cardRect();
        const k = Math.PI / (r.hw * 2.4); // half a turn for ~1.2 card widths of drag
        const s0 = samples[0];
        const dt = Math.max(0.016, (now - s0.t) / 1000);
        const vYaw = ((e.clientX - s0.x) * k) / dt;
        const vPitch = ((e.clientY - s0.y) * k) / dt;
        motion.drag(dx * k, dy * k, vYaw, vPitch);
      }
      return;
    }
    if (e.pointerType === "mouse") {
      const r = cardRect();
      const nx = (e.clientX - r.cx) / r.hw;
      const ny = (e.clientY - r.cy) / r.hh;
      const inside = Math.abs(nx) < 1.4 && Math.abs(ny) < 1.25;
      motion.hover.y = inside ? Math.max(-1, Math.min(1, nx)) * 0.3 : 0;
      motion.hover.x = inside ? Math.max(-1, Math.min(1, ny)) * 0.24 : 0;
      if (inside) motion.poke();
    }
  });

  const end = (e) => {
    if (!down || e.pointerId !== down.id) return;
    if (down.moved) motion.endDrag();
    else if (performance.now() - down.t < TAP_TIME && near(e.clientX, e.clientY, 1.0)) onTap?.();
    down = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", (e) => {
    if (down && e.pointerId === down.id && down.moved) motion.endDrag();
    down = null;
  });
  canvas.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse" && !down) motion.hover.x = motion.hover.y = 0;
  });
}
