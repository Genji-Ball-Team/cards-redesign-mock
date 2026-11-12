// Canvas text in condensed Saira with tracking, with fallbacks for browsers whose canvas lacks
// fontStretch or letterSpacing (older Safari): a horizontal scale and per-glyph placement.

export async function loadFonts() {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load("800 64px Saira"),
    document.fonts.load("600 32px Saira"),
  ]).catch(() => {});
}

export function drawTracked(ctx, text, x, y, { size, weight = 800, condensed = true, tracking = 0, align = "center" }) {
  ctx.save();
  ctx.font = `${weight} ${size}px Saira, system-ui, sans-serif`;
  let squeeze = 1;
  if (condensed) {
    if ("fontStretch" in ctx) ctx.fontStretch = "condensed";
    else squeeze = 0.78;
  }
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width * squeeze);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  for (let i = 0; i < chars.length; i++) {
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(squeeze, 1);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
    cx += widths[i] + tracking;
  }
  ctx.restore();
  return total;
}
