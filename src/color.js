// OKLCH -> linear sRGB, so the shaders get the same rarity colours the CSS uses.

export function oklchToLinear(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;
  const rgb = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  return rgb.map((v) => Math.max(0, v));
}

// "oklch(84% 0.01 215)" -> linear sRGB [r, g, b]
export function cssOklchToLinear(css) {
  const m = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(css);
  if (!m) return [1, 1, 1];
  const l = Number(m[1]) / (m[2] ? 100 : 1);
  return oklchToLinear(l, Number(m[3]), Number(m[4]));
}
